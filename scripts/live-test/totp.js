// A dependency-free TOTP (RFC 6238, SHA-1) for Code nodes, whose sandbox has no
// crypto module. The live test inlines this file into its TOTP Code nodes.

function sha1(bytes) {
	const ml = bytes.length * 8;
	const m = bytes.slice();
	m.push(0x80);
	while (m.length % 64 !== 56) m.push(0);
	for (let i = 7; i >= 0; i--) m.push(Math.floor(ml / Math.pow(2, 8 * i)) & 255);
	let h0 = 0x67452301,
		h1 = 0xefcdab89,
		h2 = 0x98badcfe,
		h3 = 0x10325476,
		h4 = 0xc3d2e1f0;
	const w = new Array(80);
	for (let c = 0; c < m.length; c += 64) {
		for (let t = 0; t < 16; t++)
			w[t] =
				(m[c + 4 * t] << 24) |
				(m[c + 4 * t + 1] << 16) |
				(m[c + 4 * t + 2] << 8) |
				m[c + 4 * t + 3];
		for (let t = 16; t < 80; t++) {
			const x = w[t - 3] ^ w[t - 8] ^ w[t - 14] ^ w[t - 16];
			w[t] = (x << 1) | (x >>> 31);
		}
		let a = h0,
			b = h1,
			cc = h2,
			d = h3,
			e = h4;
		for (let t = 0; t < 80; t++) {
			let f, k;
			if (t < 20) {
				f = (b & cc) | (~b & d);
				k = 0x5a827999;
			} else if (t < 40) {
				f = b ^ cc ^ d;
				k = 0x6ed9eba1;
			} else if (t < 60) {
				f = (b & cc) | (b & d) | (cc & d);
				k = 0x8f1bbcdc;
			} else {
				f = b ^ cc ^ d;
				k = 0xca62c1d6;
			}
			const temp = (((a << 5) | (a >>> 27)) + f + e + k + w[t]) | 0;
			e = d;
			d = cc;
			cc = (b << 30) | (b >>> 2);
			b = a;
			a = temp;
		}
		h0 = (h0 + a) | 0;
		h1 = (h1 + b) | 0;
		h2 = (h2 + cc) | 0;
		h3 = (h3 + d) | 0;
		h4 = (h4 + e) | 0;
	}
	const out = [];
	for (const h of [h0, h1, h2, h3, h4])
		out.push((h >>> 24) & 255, (h >>> 16) & 255, (h >>> 8) & 255, h & 255);
	return out;
}
function hmac(key, msg) {
	if (key.length > 64) key = sha1(key);
	key = key.concat(new Array(64 - key.length).fill(0));
	return sha1(key.map((b) => b ^ 0x5c).concat(sha1(key.map((b) => b ^ 0x36).concat(msg))));
}
function base32(s) {
	const a = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
	let bits = '';
	for (const ch of s.replace(/=+$/, '').toUpperCase()) {
		const v = a.indexOf(ch);
		if (v >= 0) bits += v.toString(2).padStart(5, '0');
	}
	const out = [];
	for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
	return out;
}
function totp(keyBytes, seconds, digits = 6) {
	const counter = Math.floor(seconds / 30);
	const msg = [
		0,
		0,
		0,
		0,
		(counter >>> 24) & 255,
		(counter >>> 16) & 255,
		(counter >>> 8) & 255,
		counter & 255,
	];
	const h = hmac(keyBytes, msg);
	const off = h[19] & 15;
	const code =
		(((h[off] & 127) << 24) | (h[off + 1] << 16) | (h[off + 2] << 8) | h[off + 3]) %
		Math.pow(10, digits);
	return String(code).padStart(digits, '0');
}

export { sha1, hmac, base32, totp };
