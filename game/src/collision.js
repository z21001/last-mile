// Box geometry shared by the rules: overlap tests and the line from the gun to the aim point.

/** Whether two boxes ({ left, top, right, bottom }) overlap. */
export function overlaps(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/** Whether a point lies inside a box. */
export function contains(box, x, y) {
  return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
}

/** Whether two boxes overlap horizontally. */
export function overlapsX(a, b) {
  return a.left < b.right && a.right > b.left;
}

/** The distance between two box centres. */
export function centreDistance(a, b) {
  return Math.hypot((a.left + a.right) / 2 - (b.left + b.right) / 2, (a.top + a.bottom) / 2 - (b.top + b.bottom) / 2);
}
