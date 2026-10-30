
function reply(body: object, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function onRequest({ request, env }: { request: Request; env: { DISCORD_WEBHOOK_URL?: string } }) {
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  if (request.headers.get('origin') !== new URL(request.url).origin) return reply({ error: 'Origen no permitido.' }, 403);
  if (Number(request.headers.get('content-length')) > 4 * 1024 * 1024) return reply({ error: 'La solicitud es demasiado grande.' }, 413);
  try {
    if (!request.headers.get('content-type')?.startsWith('multipart/form-data')) return reply({ error: 'Formato de solicitud no válido.' }, 415);
    const reader = request.body?.getReader();
    if (!reader) return reply({ error: 'La solicitud está vacía.' }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 4 * 1024 * 1024) {
        await reader.cancel();
        return reply({ error: 'La solicitud es demasiado grande.' }, 413);
      }
      chunks.push(chunk.value);
    }
    const boundedBody = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { boundedBody.set(chunk, offset); offset += chunk.length; }
    const data = await new Response(boundedBody, { headers: { 'Content-Type': request.headers.get('content-type')! } }).formData();
    if (data.get('bot-field')) return reply({ error: 'No se pudo validar la solicitud.' }, 400);
    const read = (name: string) => typeof data.get(name) === 'string' ? String(data.get(name)).trim() : '';
    const mode = read('mode');
    if (!['support', 'error'].includes(mode)) return reply({ error: 'Selecciona soporte o reporte de errores.' }, 400);
    const subject = read('subject');
    const message = read('message');
    const script = read('script');
    const environment = read('environment');
    const category = read('category');
    if (!subject || subject.length > 160 || message.length < 20 || message.length > 5000 || script.length > 1000 || environment.length > 200 || !['error', 'web', 'lua', 'request', 'site'].includes(category)) {
      return reply({ error: 'Revisa el asunto y la descripción (entre 20 y 5000 caracteres).' }, 400);
    }
    const upload = data.get('screenshot');
    const file = upload instanceof File && upload.size > 0 ? upload : null;
    let bytes: Uint8Array | undefined;
    if (file) {
      if (file.size > 3 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return reply({ error: 'La captura debe ser PNG, JPG o WebP y pesar hasta 3 MB.' }, 400);
      bytes = new Uint8Array(await file.arrayBuffer());
      const png = bytes.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10';
      const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      const webp = new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP';
      if (!(file.type === 'image/png' && png || file.type === 'image/jpeg' && jpeg || file.type === 'image/webp' && webp)) return reply({ error: 'El contenido del archivo no corresponde a una imagen válida.' }, 400);
    }
    const webhook = env.DISCORD_WEBHOOK_URL;
    if (!webhook || !/^https:\/\/discord\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/.test(webhook)) return reply({ error: 'El envío a Discord aún no está configurado. Inténtalo más tarde o entra en la comunidad de Discord.' }, 503);
    // Rule-based triage works without another provider or any additional credentials.
    const text = `${subject} ${message}`.toLowerCase();
    const priority = /pérdida de datos|perdida de datos|no puedo acceder|no carga|no funciona/.test(text) ? 'Revisión prioritaria sugerida' : 'Revisión normal sugerida';
    const missing = [!script && 'referencia del código', !environment && 'juego y dispositivo', !/paso|primero|después|despues|al abrir|cuando/.test(text) && 'pasos para reproducirlo'].filter(Boolean);
    const analysis = `${priority}. ${missing.length ? `Falta concretar: ${missing.join(', ')}.` : 'Incluye referencia, entorno y contexto para la revisión.'} Próximo paso: reproducir el comportamiento y contrastar el mensaje de error. Clasificación por reglas sobre el texto; no confirma una causa ni analiza la imagen.`;
    const extension = file?.type === 'image/png' ? 'png' : file?.type === 'image/jpeg' ? 'jpg' : 'webp';
    const embeds: Record<string, unknown>[] = [
      { title: `${mode === 'support' ? 'Soporte' : 'Error'} · ${subject}`, description: message.slice(0, 3000), color: 12768938, fields: [
        { name: 'Categoría', value: category },
        { name: 'Código', value: script || 'No indicado' },
        { name: 'Juego y dispositivo', value: environment || 'No indicado' },
      ], timestamp: new Date().toISOString() },
      { title: 'Análisis automático orientativo', description: analysis },
    ];
    if (file) embeds[0].image = { url: `attachment://captura.${extension}` };
    const attachments = file ? [{ id: 0, filename: `captura.${extension}` }] : [];
    if (message.length > 3000) attachments.push({ id: 1, filename: 'informe-completo.txt' });
    const payload = { allowed_mentions: { parse: [] }, embeds, attachments };
    const body = new FormData();
    body.set('payload_json', JSON.stringify(payload));
    if (file) body.set('files[0]', file, `captura.${extension}`);
    if (message.length > 3000) body.set('files[1]', new Blob([message], { type: 'text/plain;charset=utf-8' }), 'informe-completo.txt');
    const response = await fetch(`${webhook}?wait=true`, { method: 'POST', body, signal: AbortSignal.timeout(15000) });
    if (!response.ok) return reply({ error: response.status === 429 ? 'Discord está ocupado. Espera un momento y vuelve a intentarlo.' : 'Discord no pudo recibir el informe. Vuelve a intentarlo.' }, 502);
    return reply({ analysis });
  } catch {
    return reply({ error: 'No se pudo enviar el informe. Vuelve a intentarlo.' }, 503);
  }
}
