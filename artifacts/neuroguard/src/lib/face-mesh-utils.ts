export interface Point {
  x: number;
  y: number;
}

export const LEFT_EYE = [362, 385, 387, 263, 373, 380];
export const RIGHT_EYE = [33, 160, 158, 133, 153, 144];

const euclideanDistance = (p1: Point, p2: Point): number => {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

export const calculateEAR = (landmarks: any[], eyeIndices: number[]): number => {
  if (!landmarks || landmarks.length === 0) return 0;
  
  // p1 to p6 correspond to eyeIndices[0] to eyeIndices[5]
  const p1 = landmarks[eyeIndices[0]];
  const p2 = landmarks[eyeIndices[1]];
  const p3 = landmarks[eyeIndices[2]];
  const p4 = landmarks[eyeIndices[3]];
  const p5 = landmarks[eyeIndices[4]];
  const p6 = landmarks[eyeIndices[5]];

  if (!p1 || !p2 || !p3 || !p4 || !p5 || !p6) return 0;

  const vertical1 = euclideanDistance(p2, p6);
  const vertical2 = euclideanDistance(p3, p5);
  const horizontal = euclideanDistance(p1, p4);

  if (horizontal === 0) return 0;

  return (vertical1 + vertical2) / (2.0 * horizontal);
};

export const getFatigueState = (ear: number, perclos: number): 'alert' | 'drowsy' | 'fatigued' => {
  if (perclos >= 0.3 || ear < 0.20) {
    return 'fatigued';
  } else if (perclos >= 0.15 || ear < 0.28) {
    return 'drowsy';
  }
  return 'alert';
};
