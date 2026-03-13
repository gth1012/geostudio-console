/**
 * geocode-detector.ts
 * GeoCode 검출 엔진 — Phase 1 구현
 * 기준 문서: GS-ARCH-015 v1.2 (LOCK)
 *
 * Layer A — Presence Check (존재 확인)
 * Layer B — Frequency Structure + Ink Residual (병렬 주 신호)
 *
 * Phase 2: Layer C (Geometry Quick Check) 추가 예정
 * Phase 2: Layer D (Server Geometry Analysis) 추가 예정
 */

// ─────────────────────────────────────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────────────────────────────────────

export type GeoCodeResult = 'PRESENT' | 'WEAK' | 'ABSENT';

export interface DetectionResult {
  result: GeoCodeResult;
  layerA: LayerAResult;
  layerB: LayerBResult;
  riskScore: number;       // Layer C soft score 포함 누적값 (Phase 2~)
  debugInfo?: string;
}

export interface LayerAResult {
  passed: boolean;
  energyLevel: number;        // 저주파 에너지 측정값
  coherence: number;          // 방향성 일관성 (0~1)
  scaleRatio: ScaleRatio;     // 다중스케일 비율
  moireDetected: boolean;     // 모아레 검출 여부
}

export interface LayerBResult {
  passed: boolean;
  frequencyScore: number;     // Frequency Structure 점수 (0~1)
  inkResidualScore: number;   // Ink Residual 점수 (0~1)
  combinedScore: number;      // 병렬 합산 점수
}

export interface ScaleRatio {
  low: number;    // 목표: 0.70 ± 0.10
  mid: number;    // 목표: 0.20 ± 0.15
  high: number;   // 목표: 0.10 ± 0.20
}

// ─────────────────────────────────────────────────────────────────────────────
// Threshold 설정값 (GS-ARCH-015 v1.2 설계 초기값)
// ⚠️ 실측 후 v1.3에서 확정. 환경변수로 관리 권장.
// ─────────────────────────────────────────────────────────────────────────────

const THRESHOLD = {
  // Layer A
  ENERGY_BASE: 0.15,          // θ_base — 저주파 에너지 최소값
  COHERENCE_PRESENT: 0.70,    // 방향성 일관성 PRESENT 기준
  COHERENCE_WEAK: 0.40,       // 방향성 일관성 WEAK 기준
  SCALE_LOW_TARGET: 0.70,     // 저주파 비율 목표
  SCALE_MID_TARGET: 0.20,     // 중주파 비율 목표
  SCALE_HIGH_TARGET: 0.10,    // 고주파 비율 목표
  SCALE_TOLERANCE_LOW: 0.10,  // 저주파 허용 오차
  SCALE_TOLERANCE_MID: 0.15,  // 중주파 허용 오차
  SCALE_TOLERANCE_HIGH: 0.20, // 고주파 허용 오차

  // Layer B
  COMBINED_PRESENT: 0.85,     // cos_sim PRESENT 기준
  COMBINED_WEAK: 0.60,        // cos_sim WEAK 기준

  // 주파수 대역 (px)
  FREQ_LOW_MIN: 8,
  FREQ_LOW_MAX: 16,
  FREQ_MID_MIN: 16,
  FREQ_MID_MAX: 28,
  FREQ_HIGH_MIN: 28,
  FREQ_HIGH_MAX: 40,

  // ROI
  ROI_CENTER_RATIO: 0.35,     // 센터 35% 추출 (30~40% 중간값)
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 유틸리티
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Canvas에서 센터 ROI 추출
 * GS-ARCH-015 v1.2: 55×85mm 카드 기준 센터 30~40%
 */
function extractCenterROI(
  imageData: ImageData,
  ratioW: number = THRESHOLD.ROI_CENTER_RATIO,
  ratioH: number = THRESHOLD.ROI_CENTER_RATIO,
): ImageData {
  const { width, height, data } = imageData;

  const roiW = Math.floor(width * ratioW);
  const roiH = Math.floor(height * ratioH);
  const startX = Math.floor((width - roiW) / 2);
  const startY = Math.floor((height - roiH) / 2);

  const roiData = new Uint8ClampedArray(roiW * roiH * 4);

  for (let y = 0; y < roiH; y++) {
    for (let x = 0; x < roiW; x++) {
      const srcIdx = ((startY + y) * width + (startX + x)) * 4;
      const dstIdx = (y * roiW + x) * 4;
      roiData[dstIdx]     = data[srcIdx];
      roiData[dstIdx + 1] = data[srcIdx + 1];
      roiData[dstIdx + 2] = data[srcIdx + 2];
      roiData[dstIdx + 3] = data[srcIdx + 3];
    }
  }

  return new ImageData(roiData, roiW, roiH);
}

/**
 * Blue 채널 추출
 * GS-ARCH-015 v1.2: Blue 채널 중심 (인간 시각 민감도 최저)
 */
function extractBlueChannel(imageData: ImageData): Float32Array {
  const { width, height, data } = imageData;
  const blue = new Float32Array(width * height);

  for (let i = 0; i < width * height; i++) {
    blue[i] = data[i * 4 + 2] / 255.0; // B 채널 정규화
  }

  return blue;
}

/**
 * 간이 2D FFT — 주파수 에너지 분석
 * 실제 프로덕션에서는 fft.js 라이브러리 사용 권장
 */
function computeFrequencyEnergy(
  channel: Float32Array,
  width: number,
  height: number,
): { low: number; mid: number; high: number; total: number } {
  // 행별 1D DFT로 주파수 에너지 근사 계산
  let lowEnergy = 0;
  let midEnergy = 0;
  let highEnergy = 0;

  for (let y = 0; y < height; y++) {
    const row = channel.slice(y * width, (y + 1) * width);

    for (let k = THRESHOLD.FREQ_LOW_MIN; k < THRESHOLD.FREQ_LOW_MAX && k < width / 2; k++) {
      let re = 0, im = 0;
      for (let n = 0; n < width; n++) {
        const angle = (2 * Math.PI * k * n) / width;
        re += row[n] * Math.cos(angle);
        im -= row[n] * Math.sin(angle);
      }
      lowEnergy += (re * re + im * im) / (width * width);
    }

    for (let k = THRESHOLD.FREQ_MID_MIN; k < THRESHOLD.FREQ_MID_MAX && k < width / 2; k++) {
      let re = 0, im = 0;
      for (let n = 0; n < width; n++) {
        const angle = (2 * Math.PI * k * n) / width;
        re += row[n] * Math.cos(angle);
        im -= row[n] * Math.sin(angle);
      }
      midEnergy += (re * re + im * im) / (width * width);
    }

    for (let k = THRESHOLD.FREQ_HIGH_MIN; k < THRESHOLD.FREQ_HIGH_MAX && k < width / 2; k++) {
      let re = 0, im = 0;
      for (let n = 0; n < width; n++) {
        const angle = (2 * Math.PI * k * n) / width;
        re += row[n] * Math.cos(angle);
        im -= row[n] * Math.sin(angle);
      }
      highEnergy += (re * re + im * im) / (width * width);
    }
  }

  const total = lowEnergy + midEnergy + highEnergy || 1;
  return {
    low:   lowEnergy / total,
    mid:   midEnergy / total,
    high:  highEnergy / total,
    total: lowEnergy + midEnergy + highEnergy,
  };
}

/**
 * 방향성 일관성 측정 (directional coherence)
 * 수평/수직 그래디언트 방향 분산으로 측정
 */
function measureDirectionalCoherence(
  channel: Float32Array,
  width: number,
  height: number,
): number {
  const angles: number[] = [];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const gx = channel[idx + 1] - channel[idx - 1];
      const gy = channel[idx + width] - channel[idx - width];
      const mag = Math.sqrt(gx * gx + gy * gy);

      if (mag > 0.02) { // 노이즈 제거 임계값
        angles.push(Math.atan2(gy, gx));
      }
    }
  }

  if (angles.length === 0) return 0;

  // 각도 분산으로 일관성 측정 (낮은 분산 = 높은 일관성)
  const meanAngle = angles.reduce((a, b) => a + b, 0) / angles.length;
  const variance = angles.reduce((sum, a) => {
    const diff = a - meanAngle;
    return sum + diff * diff;
  }, 0) / angles.length;

  // 분산 → 일관성 변환 (0~1)
  return Math.max(0, 1 - Math.sqrt(variance) / Math.PI);
}

/**
 * 모아레 패턴 검출
 * 이상 주파수 피크 존재 여부 확인
 */
function detectMoire(
  channel: Float32Array,
  width: number,
  _height: number,
): boolean {
  // 첫 번째 행으로 간이 검출
  const row = channel.slice(0, width);
  const peaks: number[] = [];

  for (let k = 2; k < width / 2 - 1; k++) {
    let re = 0, im = 0;
    for (let n = 0; n < width; n++) {
      const angle = (2 * Math.PI * k * n) / width;
      re += row[n] * Math.cos(angle);
      im -= row[n] * Math.sin(angle);
    }
    const magnitude = Math.sqrt(re * re + im * im) / width;
    peaks.push(magnitude);
  }

  if (peaks.length === 0) return false;

  const mean = peaks.reduce((a, b) => a + b, 0) / peaks.length;
  const std = Math.sqrt(
    peaks.reduce((sum, p) => sum + (p - mean) ** 2, 0) / peaks.length,
  );

  // 평균 + 3σ 초과 피크가 있으면 모아레 의심
  return peaks.some(p => p > mean + 3 * std);
}

/**
 * Ink Residual 분석 — Blue 채널 잔차 패턴
 * 옵셋 인쇄 잉크 침투 흔적 측정
 */
function analyzeInkResidual(
  imageData: ImageData,
  width: number,
  height: number,
): number {
  const { data } = imageData;
  let residualSum = 0;
  let count = 0;

  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4]     / 255.0;
    const g = data[i * 4 + 1] / 255.0;
    const b = data[i * 4 + 2] / 255.0;

    // Blue 채널과 RGB 평균의 잔차
    const avg = (r + g + b) / 3;
    const residual = Math.abs(b - avg);
    residualSum += residual;
    count++;
  }

  if (count === 0) return 0;

  // 잔차 정규화 (0~1)
  return Math.min(1, (residualSum / count) * 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// Layer A — Presence Check
// ─────────────────────────────────────────────────────────────────────────────

function runLayerA(
  blueChannel: Float32Array,
  width: number,
  height: number,
): LayerAResult {
  const freq = computeFrequencyEnergy(blueChannel, width, height);
  const coherence = measureDirectionalCoherence(blueChannel, width, height);
  const moireDetected = detectMoire(blueChannel, width, height);

  const scaleRatio: ScaleRatio = {
    low:  freq.low,
    mid:  freq.mid,
    high: freq.high,
  };

  // 스케일 비율 범위 체크
  const lowOk  = Math.abs(freq.low  - THRESHOLD.SCALE_LOW_TARGET)  <= THRESHOLD.SCALE_TOLERANCE_LOW;
  const midOk  = Math.abs(freq.mid  - THRESHOLD.SCALE_MID_TARGET)  <= THRESHOLD.SCALE_TOLERANCE_MID;
  const highOk = Math.abs(freq.high - THRESHOLD.SCALE_HIGH_TARGET) <= THRESHOLD.SCALE_TOLERANCE_HIGH;
  const scaleOk = lowOk && midOk && highOk;

  const passed =
    freq.total > THRESHOLD.ENERGY_BASE &&
    coherence > THRESHOLD.COHERENCE_WEAK &&
    !moireDetected &&
    scaleOk;

  return {
    passed,
    energyLevel: freq.total,
    coherence,
    scaleRatio,
    moireDetected,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Layer B — Frequency Structure + Ink Residual (병렬)
// ─────────────────────────────────────────────────────────────────────────────

function runLayerB(
  imageData: ImageData,
  blueChannel: Float32Array,
  width: number,
  height: number,
): LayerBResult {
  // Frequency Structure 점수
  const freq = computeFrequencyEnergy(blueChannel, width, height);
  const coherence = measureDirectionalCoherence(blueChannel, width, height);
  const frequencyScore = (freq.total > THRESHOLD.ENERGY_BASE ? 0.5 : 0) +
                         (coherence > THRESHOLD.COHERENCE_WEAK ? 0.5 : 0);

  // Ink Residual 점수
  const inkResidualScore = analyzeInkResidual(imageData, width, height);

  // 병렬 합산 (두 신호 평균)
  const combinedScore = (frequencyScore + inkResidualScore) / 2;

  const passed = combinedScore >= THRESHOLD.COMBINED_WEAK;

  return {
    passed,
    frequencyScore,
    inkResidualScore,
    combinedScore,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 메인 검출 함수
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GeoCode 검출 메인 함수
 * @param imageElement - 촬영된 이미지 (HTMLImageElement 또는 HTMLCanvasElement)
 * @returns DetectionResult
 *
 * 사용 예시:
 *   const result = await detectGeoCode(imgElement);
 *   if (result.result === 'PRESENT') { ... }
 */
export async function detectGeoCode(
  imageElement: HTMLImageElement | HTMLCanvasElement,
): Promise<DetectionResult> {
  // Canvas 생성 및 이미지 렌더링
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return makeAbsentResult('Canvas context 생성 실패');
  }

  canvas.width  = imageElement instanceof HTMLCanvasElement
    ? imageElement.width
    : (imageElement as HTMLImageElement).naturalWidth;
  canvas.height = imageElement instanceof HTMLCanvasElement
    ? imageElement.height
    : (imageElement as HTMLImageElement).naturalHeight;

  ctx.drawImage(imageElement, 0, 0);

  // 전체 이미지 데이터
  const fullImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // 센터 ROI 추출
  const roiData = extractCenterROI(fullImageData);
  const roiWidth  = roiData.width;
  const roiHeight = roiData.height;

  // Blue 채널 분리
  const blueChannel = extractBlueChannel(roiData);

  // ── Layer A 실행 ──────────────────────────────────────────────────────────
  const layerA = runLayerA(blueChannel, roiWidth, roiHeight);

  // Layer A ABSENT → 즉시 종료
  if (layerA.energyLevel <= THRESHOLD.ENERGY_BASE) {
    return {
      result: 'ABSENT',
      layerA,
      layerB: makeEmptyLayerB(),
      riskScore: 0,
      debugInfo: 'Layer A: 저주파 에너지 부재 → ABSENT',
    };
  }

  // ── Layer B 실행 ──────────────────────────────────────────────────────────
  const layerB = runLayerB(roiData, blueChannel, roiWidth, roiHeight);

  // ── 최종 판정 ─────────────────────────────────────────────────────────────
  const result = determineResult(layerA, layerB);

  return {
    result,
    layerA,
    layerB,
    riskScore: 0, // Risk Engine은 서버에서 계산 (GS-ARCH-016)
    debugInfo: `Layer A: ${layerA.passed ? 'PASS' : 'FAIL'} | Layer B: ${layerB.combinedScore.toFixed(2)}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 판정 결정 로직
// ─────────────────────────────────────────────────────────────────────────────

function determineResult(layerA: LayerAResult, layerB: LayerBResult): GeoCodeResult {
  // Layer A 판정
  const coherenceAbsent  = layerA.coherence < THRESHOLD.COHERENCE_WEAK;
  const coherenceWeak    = layerA.coherence < THRESHOLD.COHERENCE_PRESENT;
  const moireWeak        = layerA.moireDetected;

  const scaleRatio = layerA.scaleRatio;
  const scaleFailCount = [
    Math.abs(scaleRatio.low  - THRESHOLD.SCALE_LOW_TARGET)  > THRESHOLD.SCALE_TOLERANCE_LOW,
    Math.abs(scaleRatio.mid  - THRESHOLD.SCALE_MID_TARGET)  > THRESHOLD.SCALE_TOLERANCE_MID,
    Math.abs(scaleRatio.high - THRESHOLD.SCALE_HIGH_TARGET) > THRESHOLD.SCALE_TOLERANCE_HIGH,
  ].filter(Boolean).length;

  // ABSENT 조건
  if (coherenceAbsent || scaleFailCount >= 2) return 'ABSENT';

  // Layer B ABSENT 조건
  if (layerB.combinedScore < THRESHOLD.COMBINED_WEAK) return 'WEAK';

  // WEAK 조건
  const weakCount = [coherenceWeak, moireWeak, scaleFailCount >= 1].filter(Boolean).length;
  if (weakCount >= 2) return 'WEAK';
  if (layerB.combinedScore < THRESHOLD.COMBINED_PRESENT) return 'WEAK';

  return 'PRESENT';
}

// ─────────────────────────────────────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────────────────────────────────────

function makeAbsentResult(debugInfo: string): DetectionResult {
  return {
    result: 'ABSENT',
    layerA: {
      passed: false,
      energyLevel: 0,
      coherence: 0,
      scaleRatio: { low: 0, mid: 0, high: 0 },
      moireDetected: false,
    },
    layerB: makeEmptyLayerB(),
    riskScore: 0,
    debugInfo,
  };
}

function makeEmptyLayerB(): LayerBResult {
  return {
    passed: false,
    frequencyScore: 0,
    inkResidualScore: 0,
    combinedScore: 0,
  };
}
