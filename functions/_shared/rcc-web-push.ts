type PushEnv={RCC_WEB_PUSH_PUBLIC_KEY?:string;RCC_WEB_PUSH_PRIVATE_KEY?:string;RCC_WEB_PUSH_SUBJECT?:string;};
type PushSubscriptionRow={id:string;user_id:string;endpoint:string;p256dh:string;auth:string};
const utf8=new TextEncoder();
function fromB64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}
function toB64Url(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const size = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) { out.set(part, offset); offset += part.length; }
  return out;
}
async function hkdf(secret: Uint8Array, salt: Uint8Array, info: Uint8Array, lengthBits: number) {
  const key = await crypto.subtle.importKey("raw", secret, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info }, key, lengthBits
  ));
}
function vapidJwsSegment(value: unknown) {
  return toB64Url(utf8.encode(JSON.stringify(value)));
}
async function createVapidToken(endpoint: URL, env: PushEnv) {
  const publicKey = env.RCC_WEB_PUSH_PUBLIC_KEY || "";
  const privateKey = env.RCC_WEB_PUSH_PRIVATE_KEY || "";
  if (!publicKey || !privateKey) throw new Error("Faltan RCC_WEB_PUSH_PUBLIC_KEY / RCC_WEB_PUSH_PRIVATE_KEY.");
  const rawPublic = fromB64Url(publicKey);
  const rawPrivate = fromB64Url(privateKey);
  if (rawPublic.length !== 65 || rawPrivate.length !== 32) throw new Error("El par de claves VAPID no tiene el formato P-256 esperado.");
  const jwk = {
    kty: "EC", crv: "P-256",
    x: toB64Url(rawPublic.slice(1, 33)),
    y: toB64Url(rawPublic.slice(33, 65)),
    d: toB64Url(rawPrivate),
    ext: true,
  };
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const header = vapidJwsSegment({ typ: "JWT", alg: "ES256" });
  const payload = vapidJwsSegment({
    aud: endpoint.origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: env.RCC_WEB_PUSH_SUBJECT || "mailto:drillbobhii@gmail.com",
  });
  const unsigned = header + "." + payload;
  const signature = new Uint8Array(await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" }, key, utf8.encode(unsigned)
  ));
  return { token: unsigned + "." + toB64Url(signature), publicKey };
}
async function encryptWebPush(payload: unknown, p256dh: string, auth: string) {
  const userPublicRaw = fromB64Url(p256dh);
  const authSecret = fromB64Url(auth);
  if (userPublicRaw.length !== 65 || authSecret.length !== 16) throw new Error("La suscripción Push contiene claves inválidas.");
  const userPublic = await crypto.subtle.importKey("raw", userPublicRaw, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ephemeral = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const serverPublic = new Uint8Array(await crypto.subtle.exportKey("raw", ephemeral.publicKey));
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: userPublic }, ephemeral.privateKey, 256));
  const authInfo = concatBytes(utf8.encode("WebPush: info\0"), userPublicRaw, serverPublic);
  const inputKeyMaterial = await hkdf(shared, authSecret, authInfo, 256);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(inputKeyMaterial, salt, utf8.encode("Content-Encoding: aes128gcm\0"), 128);
  const nonce = await hkdf(inputKeyMaterial, salt, utf8.encode("Content-Encoding: nonce\0"), 96);
  const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const clear = concatBytes(utf8.encode(JSON.stringify(payload)), new Uint8Array([2]));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce, tagLength: 128 }, aesKey, clear));
  // RFC 8188 aes128gcm body header: salt (16) | rs (4096) | key id length | ephemeral public key.
  const header = concatBytes(salt, new Uint8Array([0, 0, 16, 0, serverPublic.length]), serverPublic);
  return concatBytes(header, cipher);
}
async function sendPush(env: PushEnv, subscription: PushSubscriptionRow, payload: unknown) {
  const endpoint = new URL(subscription.endpoint);
  if (endpoint.protocol !== "https:") throw new Error("Push endpoint debe ser HTTPS.");
  const vapid = await createVapidToken(endpoint, env);
  const body = await encryptWebPush(payload, subscription.p256dh, subscription.auth);
  return await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: "vapid t=" + vapid.token + ", k=" + vapid.publicKey,
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      TTL: "90",
      Urgency: "high",
    },
    body,
    signal: AbortSignal.timeout(10000),
  });
}

export async function sendRccWebPush(env:PushEnv,subscription:PushSubscriptionRow,payload:unknown){return sendPush(env,subscription,payload);}
