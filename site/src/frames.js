// Frame sequences: loading, decoding, and nearest-frame lookup.
//
// Every frame is fetched and decoded (img.decode()) by a background queue
// well before it is drawn. Nothing assigns img.src in response to scroll; the
// render loop only ever reads frames that are already decoded, falling back
// to the nearest decoded neighbour so the canvas is never blank.

const pad = (n, w) => String(n).padStart(w, "0");

export class FrameSet {
  // pack: optional { file, offsets } when frames are bundled into one file
  // (the hosted build); frame i is bytes offsets[i]..offsets[i+1].
  constructor(id, set, meta, padWidth, pack = null) {
    this.pack = pack;
    this.packBlob = null;
    this.id = id;
    this.set = set; // "d" | "m"
    this.count = meta.count;
    this.width = meta.width;
    this.height = meta.height;
    this.fps = meta.fps;
    this.pad = padWidth;
    this.images = new Array(meta.count);
    this.loaded = 0;
    this.listeners = new Set();
  }

  // Fetches the pack once; resolves to its Blob.
  loadPack() {
    this.packBlob ??= fetch(`${import.meta.env.BASE_URL}frames/${this.pack.file}`).then((r) => {
      if (!r.ok) throw new Error(`frames/${this.pack.file}: HTTP ${r.status}`);
      return r.blob();
    });
    return this.packBlob;
  }

  url(i) {
    return `${import.meta.env.BASE_URL}frames/${this.id}/${this.set}/${pad(i + 1, this.pad)}.webp`;
  }

  has(i) {
    return this.images[i] !== undefined;
  }

  // The decoded frame closest to i, preferring earlier frames on ties.
  nearest(i) {
    i = Math.max(0, Math.min(this.count - 1, i));
    for (let d = 0; d < this.count; d++) {
      if (this.images[i - d]) return { img: this.images[i - d], index: i - d };
      if (this.images[i + d]) return { img: this.images[i + d], index: i + d };
    }
    return null;
  }

  onLoad(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  _store(i, img) {
    this.images[i] = img;
    this.loaded++;
    for (const fn of this.listeners) fn(i);
  }
}

// Coarse-to-fine order over [from, to): every 8th frame, then 4th, 2nd, rest.
// A fast flick into a half-loaded chapter still finds a frame close by.
export function coarseToFine(from, to) {
  const out = [];
  const seen = new Set();
  for (const step of [8, 4, 2, 1]) {
    for (let i = from; i < to; i += step) {
      if (!seen.has(i)) {
        seen.add(i);
        out.push(i);
      }
    }
  }
  if (to > from && !seen.has(to - 1)) out.push(to - 1);
  return out;
}

// A single prioritized queue shared by every frame set. Batches run in the
// order they're added; frames inside a batch load `concurrency` at a time.
export class LoadQueue {
  constructor(concurrency = 6) {
    this.concurrency = concurrency;
    this.tasks = [];
    this.active = 0;
  }

  // Returns a promise for the batch. onProgress(done, total) fires per frame.
  add(frameSet, indices, onProgress) {
    const todo = indices.filter((i) => !frameSet.has(i));
    if (!todo.length) {
      onProgress?.(1, 1);
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      let done = 0;
      const finish = () => {
        done++;
        onProgress?.(done, todo.length);
        if (done === todo.length) resolve();
      };
      for (const i of todo) this.tasks.push({ frameSet, i, finish });
      this._pump();
    });
  }

  _pump() {
    while (this.active < this.concurrency && this.tasks.length) {
      const { frameSet, i, finish } = this.tasks.shift();
      if (frameSet.has(i)) {
        finish();
        continue;
      }
      this.active++;
      const img = new Image();
      img.decoding = "async";
      let objectUrl = null;
      const source = frameSet.pack
        ? frameSet.loadPack().then((blob) => {
            const o = frameSet.pack.offsets;
            objectUrl = URL.createObjectURL(blob.slice(o[i], o[i + 1], "image/webp"));
            return objectUrl;
          })
        : Promise.resolve(frameSet.url(i));
      source
        .then((src) => {
          img.src = src;
          return img.decode();
        })
        .then(() => frameSet._store(i, img))
        .catch(() => {}) // a missing frame falls back to its neighbours
        .finally(() => {
          if (objectUrl) URL.revokeObjectURL(objectUrl); // the decoded image keeps its data
          this.active--;
          finish();
          this._pump();
        });
    }
  }
}

export async function loadManifest() {
  const res = await fetch(`${import.meta.env.BASE_URL}frames/manifest.json`);
  if (!res.ok) throw new Error(`frames/manifest.json: HTTP ${res.status}`);
  return res.json();
}
