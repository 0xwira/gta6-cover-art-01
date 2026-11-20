export async function prepareShot(mode,canvas,encode,photos) {
  if (!photos) throw new Error('No decoded sample photos');
  if (mode === 'cover') {
    const blob = await encode();
    const image = new Image();
    const source = URL.createObjectURL(blob);
    image.id = 'shot-image';
    image.alt = 'Exported cover';
    image.src = source;
    await image.decode();
    document.body.classList.add('cover-shot');
    canvas.replaceWith(image);
    URL.revokeObjectURL(source);
  }
  await document.fonts.ready;
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
