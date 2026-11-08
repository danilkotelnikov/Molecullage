// Test shapes for the mesh tools. A helper, not a test.

/** A UV sphere of radius r, closed, outward facing. */
export function sphere(r, n = 48, centre = [0, 0, 0]) {
  const positions = [];
  const indices = [];
  for (let i = 0; i <= n; i++) {
    const a = (Math.PI * i) / n;
    for (let j = 0; j < 2 * n; j++) {
      const b = (Math.PI * j) / n;
      positions.push(centre[0] + r * Math.sin(a) * Math.cos(b), centre[1] + r * Math.cos(a), centre[2] + r * Math.sin(a) * Math.sin(b));
    }
  }
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < 2 * n; j++) {
      const a = i * 2 * n + j;
      const b = i * 2 * n + ((j + 1) % (2 * n));
      indices.push(a, b, a + 2 * n, b, b + 2 * n, a + 2 * n);
    }
  }
  return { positions: Float64Array.from(positions), indices: Uint32Array.from(indices) };
}
