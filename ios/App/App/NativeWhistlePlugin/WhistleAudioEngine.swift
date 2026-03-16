import AVFoundation

/// AVAudioEngine 기반 휘슬 톤 생성/재생
/// .playback + .mixWithOthers → 무음 스위치 무시 + Now Playing 카드 안 뜸
class WhistleAudioEngine {
    private var audioEngine: AVAudioEngine?
    private var playerNode: AVAudioPlayerNode?
    private var isPlaying = false

    // 휘슬 파라미터
    private let sampleRate: Double = 44100
    private let baseFrequency: Float = 2800
    private let harmonicFrequency: Float = 5600
    private let lfoFrequency: Float = 28
    private let lfoDepth: Float = 80

    init() {
        setupAudioSession()
    }

    /// AVAudioSession 설정 — Now Playing 안 뜨게
    private func setupAudioSession() {
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(
                .playback,
                options: .mixWithOthers  // 다른 앱 오디오와 혼합, 미디어 카드 안 뜸
            )
            try session.setActive(true)
        } catch {
            print("[NativeWhistle] AudioSession setup failed: \(error)")
        }
    }

    /// 휘슬 재생
    func play(type: String, volume: Float) {
        stop()  // 기존 재생 중지

        setupAudioSession()

        let engine = AVAudioEngine()
        let player = AVAudioPlayerNode()
        engine.attach(player)

        let format = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 1)!

        engine.connect(player, to: engine.mainMixerNode, format: format)
        engine.mainMixerNode.outputVolume = min(max(volume, 0), 1)

        do {
            try engine.start()
        } catch {
            print("[NativeWhistle] Engine start failed: \(error)")
            return
        }

        self.audioEngine = engine
        self.playerNode = player
        self.isPlaying = true

        switch type {
        case "hold":
            playHold(player: player, format: format)
        case "long":
            playOneShot(player: player, format: format, duration: 1.5)
        case "triple":
            playTriple(player: player, format: format)
        default:
            playHold(player: player, format: format)
        }
    }

    /// 재생 중지
    func stop() {
        playerNode?.stop()
        audioEngine?.stop()
        audioEngine = nil
        playerNode = nil
        isPlaying = false
    }

    // MARK: - 톤 생성

    /// hold 모드: 루프 재생 (꾹 누르기)
    private func playHold(player: AVAudioPlayerNode, format: AVAudioFormat) {
        let duration: Double = 2.0
        guard let buffer = renderWhistleBuffer(duration: duration, fadeOut: false, format: format) else { return }
        player.play()
        // 무한 루프
        player.scheduleBuffer(buffer, at: nil, options: .loops)
    }

    /// oneShot 모드: 한 번 재생 후 정지
    private func playOneShot(player: AVAudioPlayerNode, format: AVAudioFormat, duration: Double) {
        guard let buffer = renderWhistleBuffer(duration: duration, fadeOut: true, format: format) else { return }
        player.play()
        player.scheduleBuffer(buffer) { [weak self] in
            DispatchQueue.main.async {
                self?.stop()
            }
        }
    }

    /// triple 모드: 삐삐삐 (0.25s + 0.1s쉼 + 0.25s + 0.1s쉼 + 0.5s)
    private func playTriple(player: AVAudioPlayerNode, format: AVAudioFormat) {
        let totalDuration: Double = 1.2
        let frameCount = AVAudioFrameCount(sampleRate * totalDuration)
        guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount) else { return }
        buffer.frameLength = frameCount

        guard let channelData = buffer.floatChannelData?[0] else { return }

        // 3개의 톤 구간
        let tones: [(start: Double, duration: Double)] = [
            (0, 0.25),
            (0.35, 0.25),
            (0.7, 0.5),
        ]

        // 전체 0으로 초기화
        for i in 0..<Int(frameCount) {
            channelData[i] = 0
        }

        for tone in tones {
            let startSample = Int(tone.start * sampleRate)
            let endSample = min(startSample + Int(tone.duration * sampleRate), Int(frameCount))

            for i in startSample..<endSample {
                let t = Float(i) / Float(sampleRate)
                let localT = Float(i - startSample) / Float(sampleRate)
                let localDuration = Float(tone.duration)

                // LFO
                let lfo = sin(2 * .pi * lfoFrequency * t) * lfoDepth
                let freq1 = baseFrequency + lfo
                let freq2 = harmonicFrequency + lfo * 2

                // 오실레이터
                var sample = sin(2 * .pi * freq1 * t)
                sample += 0.2 * sin(2 * .pi * freq2 * t)

                // 엔벨로프 (fade in/out)
                var env: Float = 1.0
                if localT < 0.015 {
                    env = localT / 0.015
                } else if localT > localDuration - 0.04 {
                    env = (localDuration - localT) / 0.04
                }

                // 소프트 클리핑
                sample = softClip(sample * 4.0 * env)
                channelData[i] = sample * 0.8
            }
        }

        player.play()
        player.scheduleBuffer(buffer) { [weak self] in
            DispatchQueue.main.async {
                self?.stop()
            }
        }
    }

    /// 단일 톤 버퍼 렌더링
    private func renderWhistleBuffer(duration: Double, fadeOut: Bool, format: AVAudioFormat) -> AVAudioPCMBuffer? {
        let frameCount = AVAudioFrameCount(sampleRate * duration)
        guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount) else { return nil }
        buffer.frameLength = frameCount

        guard let channelData = buffer.floatChannelData?[0] else { return nil }

        for i in 0..<Int(frameCount) {
            let t = Float(i) / Float(sampleRate)

            // LFO 비브라토
            let lfo = sin(2 * .pi * lfoFrequency * t) * lfoDepth
            let freq1 = baseFrequency + lfo
            let freq2 = harmonicFrequency + lfo * 2

            // 오실레이터
            var sample = sin(2 * .pi * freq1 * t)
            sample += 0.2 * sin(2 * .pi * freq2 * t)

            // 노이즈 (간이)
            let noise = Float.random(in: -1...1) * 0.08
            sample += noise

            // 엔벨로프
            var env: Float = 1.0
            let dur = Float(duration)
            if t < 0.015 {
                env = t / 0.015
            } else if fadeOut && t > dur - 0.04 {
                env = (dur - t) / 0.04
            }

            // 소프트 클리핑 + 게인
            sample = softClip(sample * 4.0 * env)
            channelData[i] = sample * 0.8
        }

        return buffer
    }

    /// 소프트 클리핑 (웹 코드의 waveshaper 대응)
    private func softClip(_ x: Float) -> Float {
        let amount: Float = 18
        return ((.pi + amount) * x) / (.pi + amount * abs(x))
    }
}
