export function proposeInto(scratch, scratchId, target, stop, only) {
  if (!scratch || scratch.rebuild !== true) {
    throw new Error(`${scratchId} is not a rebuild job`);
  }

  const deckPath = (target.paths ?? []).find((p) => p.kind === 'deck');
  if (!deckPath || !Array.isArray(deckPath.stops) || deckPath.stops.length === 0) {
    throw new Error('target job has no deck path with stops');
  }

  const k = deckPath.stops.length;
  if (!Number.isInteger(stop) || stop < 0 || stop >= k) {
    throw new Error(`stop ${stop} not in 0..${k - 1}`);
  }

  const t0 = deckPath.stops[stop];
  const t1 = stop + 1 < k ? deckPath.stops[stop + 1] : target.world.duration;
  const win = [t0, t1];

  const scratchVectors = scratch.vectors ?? [];
  const scratchObjects = scratch.world?.objects ?? [];
  const vecById = new Map(scratchVectors.map((v) => [v.id, v]));
  const objById = new Map(scratchObjects.map((o) => [o.id, o]));

  let allowedIds = null;
  if (Array.isArray(only) && only.length > 0) {
    allowedIds = new Set();
    const visit = (id) => {
      if (allowedIds.has(id)) return;
      const v = vecById.get(id);
      const o = objById.get(id);
      if (!v && !o) {
        throw new Error(`unknown part "${id}"`);
      }
      allowedIds.add(id);
      if (v && v.type === 'group' && Array.isArray(v.children)) {
        for (const cid of v.children) visit(cid);
      }
    };
    for (const id of only) visit(id);
  }

  const edits = [];
  let seq = 0;

  if (!Array.isArray(target.vectors)) {
    edits.push({
      id: `p-${seq++}`,
      by: 'agent',
      op: 'add',
      path: '/vectors',
      value: [],
    });
  }

  for (const v of scratchVectors) {
    if (allowedIds && !allowedIds.has(v.id)) continue;
    const copy = structuredClone(v);
    copy.id = `${scratchId}-${v.id}`;
    copy.window = [win[0], win[1]];
    if (Array.isArray(copy.children)) {
      copy.children = copy.children.map((cid) => `${scratchId}-${cid}`);
    }
    edits.push({
      id: `p-${seq++}`,
      by: 'agent',
      op: 'add',
      path: '/vectors/-',
      value: copy,
    });
  }

  const rootFrame = (target.world?.frames ?? []).find((f) => f.parent === null)?.id ?? 'root';
  for (const o of scratchObjects) {
    if (allowedIds && !allowedIds.has(o.id)) continue;
    const copy = structuredClone(o);
    copy.id = `${scratchId}-${o.id}`;
    copy.frame = rootFrame;
    copy.window = [win[0], win[1]];
    edits.push({
      id: `p-${seq++}`,
      by: 'agent',
      op: 'add',
      path: '/world/objects/-',
      value: copy,
    });
  }

  return edits;
}
