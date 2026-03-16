import Capacitor

/// Capacitor Plugin — 네이티브 휘슬 오디오
/// AVAudioSession .playback + .mixWithOthers 로 Now Playing 카드 방지
@objc(NativeWhistlePlugin)
public class NativeWhistlePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeWhistlePlugin"
    public let jsName = "NativeWhistle"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "play", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
    ]

    private lazy var engine = WhistleAudioEngine()

    @objc func play(_ call: CAPPluginCall) {
        let type = call.getString("type") ?? "hold"
        let volume = call.getFloat("volume") ?? 1.0

        engine.play(type: type, volume: volume)
        call.resolve()
    }

    @objc func stop(_ call: CAPPluginCall) {
        engine.stop()
        call.resolve()
    }
}
