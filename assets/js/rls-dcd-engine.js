/*
 * RLS-DCD Algorithm Engine (ES Module)
 * Recursive Least Squares with Dichotomous Coordinate Descent
 */

export const SOLARPUNK_CHART_PALETTE = {
    bg: '#f7faf6',
    axis: '#2f483d',
    grid: 'rgba(47, 72, 61, 0.14)',
    zeroGrid: 'rgba(47, 72, 61, 0.28)',
    border: 'rgba(47, 72, 61, 0.35)',
    ring: 'rgba(47, 72, 61, 0.18)',
    forest: '#2d7a4f',
    water: '#1d7898',
    wood: '#8c5e35',
    sprout: '#4ba36b',
    mutedText: 'rgba(47, 72, 61, 0.72)',
    canvasBg: '#f8faf7',
    pineGrid: 'rgba(22, 48, 36, 0.14)',
    pineAxis: 'rgba(22, 48, 36, 0.36)',
    pineText: '#2e4c3e',
    forestGreen: '#2d7a4f',
    sproutGreen: '#4ba36b',
    waterBlue: '#1d7898',
    woodOchre: '#b86b28'
};

export const SOLARPUNK_NIGHT_CHART_PALETTE = {
    bg: '#0d2022',
    axis: '#dcefe5',
    grid: 'rgba(255, 154, 60, 0.14)',
    zeroGrid: 'rgba(255, 154, 60, 0.28)',
    border: 'rgba(220, 239, 229, 0.32)',
    ring: 'rgba(255, 154, 60, 0.2)',
    forest: '#4ad688',
    water: '#4dd0e1',
    wood: '#ff9a3c',
    sprout: '#ffb85c',
    mutedText: 'rgba(220, 239, 229, 0.75)',
    canvasBg: '#0d2022',
    pineGrid: 'rgba(255, 154, 60, 0.14)',
    pineAxis: '#dcefe5',
    pineText: '#dcefe5',
    forestGreen: '#4ad688',
    sproutGreen: '#ffb85c',
    waterBlue: '#4dd0e1',
    woodOchre: '#ff9a3c'
};

export class RLSDCD {
    constructor(order = 2, lambda = 0.99, Mb = 16, Nu = 8) {
        this.N = order;
        this.lambda = lambda;
        this.Mb = Mb;
        this.Nu = Nu;
        this.H = 1.0;

        // Pre-allocate typed arrays once to avoid GC churn during resets
        this.w = new Float64Array(this.N);
        this.p = new Float64Array(this.N);
        this.residual = new Float64Array(this.N);
        this.R = Array.from({ length: this.N }, () => new Float64Array(this.N));

        this.reset();
    }

    reset() {
        this.w.fill(0);
        this.p.fill(0);
        this.residual.fill(0);
        for (let i = 0; i < this.N; i++) {
            this.R[i].fill(0);
        }
        this.stepCount = 0;

        const delta = 0.01;
        for (let i = 0; i < this.N; i++) {
            this.R[i][i] = delta;
        }
    }

    setParams(lambda, Mb, Nu = this.Nu) {
        if (Number.isFinite(lambda)) this.lambda = lambda;
        if (Number.isFinite(Mb)) this.Mb = Mb;
        if (Number.isFinite(Nu)) this.Nu = Nu;
    }

    update(x, d) {
        for (let i = 0; i < this.N; i++) {
            const row = this.R[i];
            const xi = x[i];
            for (let j = 0; j < this.N; j++) {
                row[j] = this.lambda * row[j] + xi * x[j];
            }
            this.p[i] = this.lambda * this.p[i] + xi * d;
        }

        this.dcdSolve();
        this.stepCount += 1;

        let yHat = 0;
        for (let i = 0; i < this.N; i++) {
            yHat += this.w[i] * x[i];
        }
        return yHat;
    }

    computeResidual() {
        for (let i = 0; i < this.N; i++) {
            const row = this.R[i];
            let rw = 0;
            for (let j = 0; j < this.N; j++) {
                rw += row[j] * this.w[j];
            }
            this.residual[i] = this.p[i] - rw;
        }
    }

    *dcdStepGenerator() {
        this.computeResidual();

        let stepSize = this.H;
        let updates = 0;

        yield { type: 'start', w: Array.from(this.w), d: stepSize, action: 'Inicio DCD' };

        for (let m = 1; m <= this.Mb; m++) {
            stepSize /= 2;
            yield {
                type: 'new_bit',
                w: Array.from(this.w),
                d: stepSize,
                bit: m,
                action: `Bit ${m}: paso ${stepSize.toFixed(4)}`
            };

            let success = true;
            while (success && updates < this.Nu) {
                success = false;
                for (let i = 0; i < this.N; i++) {
                    const threshold = (stepSize * this.R[i][i]) / 2;
                    const axisName = `w${i + 1}`;
                    const direction = Math.sign(this.residual[i]) || 1;
                    const wTrial = Array.from(this.w);
                    wTrial[i] += direction * stepSize;

                    yield {
                        type: 'trial',
                        w: Array.from(this.w),
                        w_trial: wTrial,
                        d: stepSize,
                        bit: m,
                        axis: i,
                        action: `Prueba ${direction > 0 ? '+' : '-'}${stepSize.toFixed(4)} en ${axisName}`
                    };

                    if (Math.abs(this.residual[i]) > threshold) {
                        const deltaW = direction * stepSize;
                        this.w[i] += deltaW;
                        for (let j = 0; j < this.N; j++) {
                            this.residual[j] -= deltaW * this.R[j][i];
                        }
                        updates += 1;
                        success = true;
                        yield {
                            type: 'accept',
                            w: Array.from(this.w),
                            d: stepSize,
                            bit: m,
                            axis: i,
                            action: `Aceptado en ${axisName}`
                        };
                        if (updates >= this.Nu) break;
                    } else {
                        yield {
                            type: 'reject',
                            w: Array.from(this.w),
                            d: stepSize,
                            bit: m,
                            axis: i,
                            action: `Rechazado en ${axisName}`
                        };
                    }
                }
            }
            if (updates >= this.Nu) break;
        }

        this.stepCount += 1;
        yield { type: 'finish', w: Array.from(this.w), action: 'Iteracion completada' };
    }

    dcdSolve() {
        this.computeResidual();

        let stepSize = this.H;
        let updates = 0;

        for (let m = 1; m <= this.Mb; m++) {
            stepSize /= 2;
            let success = true;
            while (success && updates < this.Nu) {
                success = false;
                for (let i = 0; i < this.N; i++) {
                    if (Math.abs(this.residual[i]) > (stepSize * this.R[i][i]) / 2) {
                        const deltaW = (Math.sign(this.residual[i]) || 1) * stepSize;
                        this.w[i] += deltaW;
                        for (let j = 0; j < this.N; j++) {
                            this.residual[j] -= deltaW * this.R[j][i];
                        }
                        updates += 1;
                        success = true;
                        if (updates >= this.Nu) break;
                    }
                }
            }
            if (updates >= this.Nu) break;
        }
    }

    static computeErrorSurface(targetW = [0.5, -0.3], gridSize = 41, minVal = -1, maxVal = 1) {
        const span = maxVal - minVal;
        const step = span / (gridSize - 1);
        const surface = Array.from({ length: gridSize }, () => new Float64Array(gridSize));
        for (let i = 0; i < gridSize; i++) {
            const w2 = minVal + i * step;
            for (let j = 0; j < gridSize; j++) {
                const w1 = minVal + j * step;
                const dw1 = targetW[0] - w1;
                const dw2 = targetW[1] - w2;
                surface[i][j] = dw1 * dw1 + dw2 * dw2;
            }
        }
        return surface;
    }
}

export class SignalGenerator {
    constructor(waveType = 'sine', wTarget = [0.5, -0.3]) {
        this.waveType = waveType;
        this.w_target = [...wTarget];
        this.reset();
    }

    reset() {
        this.n = 0;
        this.lastX1 = 0;
        this.lastX2 = 0;
    }

    setTarget(w1, w2) {
        this.w_target = [w1, w2];
    }

    setWaveform(waveType) {
        if (waveType === 'sine' || waveType === 'square' || waveType === 'step') {
            this.waveType = waveType;
        }
    }

    sampleInput() {
        if (this.waveType === 'square') {
            return Math.sin(this.n * 0.12) >= 0 ? 1.0 : -1.0;
        }
        if (this.waveType === 'step') {
            if (this.n < 15) return 0.15;
            return Math.floor((this.n - 15) / 55) % 2 === 0 ? 1.0 : -0.75;
        }
        return Math.sin(this.n * 0.1) + 0.5 * Math.sin(this.n * 0.25);
    }

    next(noiseLevel = 0.01) {
        const [w1, w2] = this.w_target;
        const x = this.sampleInput();

        this.lastX2 = this.lastX1;
        this.lastX1 = x;

        const pureD = w1 * this.lastX1 + w2 * this.lastX2;
        const noise = (Math.random() - 0.5) * 2 * noiseLevel;
        const d = pureD + noise;

        this.n += 1;
        return { x: [this.lastX1, this.lastX2], d, pureD, input: x };
    }
}
