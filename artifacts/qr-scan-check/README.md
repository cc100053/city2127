# Large plain QR scan diagnostic — 2026-10-08

[city-15-qr.png](city-15-qr.png) is the user-requested saved test image: 656×656 pixels, pure black on white, four-module quiet zone, generated with the existing `qrcode-generator` dependency at error-correction level M. Exact payload round-trip decoding with the existing jsQR dependency and visual inspection passed.

Encoded destination:

```text
http://192.168.3.7:8787/city/8462a7efdc80c4680d90bf805b910dcc
```

This is a fixed link to proposal 15 in the user's local exhibition database. It works only when that archive exists, the exhibition server is running at that LAN address, and the phone can reach it. GitHub upload does not publish the city or make this private LAN address accessible from the Internet. The database and participant answers are not included.

The user reported successful opening after receiving this test image; the exact opening method and the reason the original on-screen scan failed were not established. The original desktop screenshot also decoded to this same URL. This does not prove that contrast/size caused the failure.

This image is not applied to the website and must not replace dynamically generated QR codes for other proposals. The linked building sculpture, website QR styling, mobile-lite city renderer and server source are unchanged by this diagnostic/upload stage. See the [task handoff](../../docs/handoffs/random-building-qr.md) and [validation record](../../docs/VALIDATION.md) for the completed implementation and remaining physical-device checks.
