
/**
 * RLS-DCD Algorithm Engine
 * This implements the Recursive Least Squares algorithm with 
 * Dichotomous Coordinate Descent for system identification.
 */

class RLSDCD {
    constructor(order, lambda = 0.99, Mb = 16, Nu = 8) {
        this.N = order;
        this.lambda = lambda;
        this.Mb = Mb;
        this.Nu = Nu;

        // RLS State
        this.w = new Array(this.N).fill(0); // Weights
        this.R = Array.from({ length: this.N }, () => new Array(this.N).fill(0)); // Correlation matrix
        this.p = new Array(this.N).fill(0); // Cross-correlation vector

        // Identity initialization for R
        const delta = 0.01;
        for (let i = 0; i < this.N; i++) this.R[i][i] = delta;

        // DCD State
        this.H = 1.0; // Initial step size
        this.residual = new Array(this.N).fill(0); // r = p - Rw
    }

    /**
     * Update RLS state with new sample
     * @param {Array} x - Input vector (delay line)
     * @param {number} d - Desired signal
     */
    update(x, d) {
        // 1. Update R and p (RLS)
        for (let i = 0; i < this.N; i++) {
            for (let j = 0; j < this.N; j++) {
                this.R[i][j] = this.lambda * this.R[i][j] + x[i] * x[j];
            }
            this.p[i] = this.lambda * this.p[i] + x[i] * d;
        }

        // 2. Solve Rw = p using DCD
        this.dcdSolve();

        // 3. Predicted output
        let y_hat = 0;
        for (let i = 0; i < this.N; i++) {
            y_hat += this.w[i] * x[i];
        }
        return y_hat;
    }

    /**
     * DCD Solver with step-by-step diagnostics (based on Python reference)
     * Use this for educational visualization.
     */
    *dcdStepGenerator() {
        // Re-calculate residual r = p - Rw
        for (let i = 0; i < this.N; i++) {
            let Rw_i = 0;
            for (let j = 0; j < this.N; j++) {
                Rw_i += this.R[i][j] * this.w[j];
            }
            this.residual[i] = this.p[i] - Rw_i;
        }

        let H = 1.0;
        let k = 0;

        yield { type: "start", w: [...this.w], d: H, action: "Inicio" };

        for (let m = 1; m <= this.Mb; m++) {
            H /= 2;
            yield { type: "new_bit", w: [...this.w], d: H, bit: m, action: `Nuevo bit: Paso = ${H}` };

            let success = true;
            while (success && k < this.Nu) {
                success = false;
                for (let i = 0; i < this.N; i++) {
                    const threshold = (H * this.R[i][i]) / 2;
                    const axisName = i === 0 ? "w1" : "w2";

                    const direction = Math.sign(this.residual[i]) || 1;
                    const w_trial = [...this.w];
                    w_trial[i] += direction * H;

                    yield {
                        type: "trial",
                        w: [...this.w],
                        w_trial: w_trial,
                        d: H, bit: m, axis: i,
                        action: `Probando ${direction > 0 ? '+' : '-'}${H} en ${axisName}`
                    };

                    if (Math.abs(this.residual[i]) > threshold) {
                        const step = direction * H;
                        this.w[i] += step;
                        for (let j = 0; j < this.N; j++) {
                            this.residual[j] -= step * this.R[j][i];
                        }
                        k++;
                        success = true;
                        yield { type: "accept", w: [...this.w], d: H, bit: m, axis: i, action: "¡Aceptado!" };
                        if (k >= this.Nu) break;
                    } else {
                        yield { type: "reject", w: [...this.w], d: H, bit: m, axis: i, action: "Rechazado" };
                    }
                }
            }
            if (k >= this.Nu) break;
        }
        yield { type: "finish", w: [...this.w], action: "Terminado" };
    }

    /**
     * Standard DCD Solver (Fast)
     */
    dcdSolve() {
        // Re-calculate residual r = p - Rw
        for (let i = 0; i < this.N; i++) {
            let Rw_i = 0;
            for (let j = 0; j < this.N; j++) {
                Rw_i += this.R[i][j] * this.w[j];
            }
            this.residual[i] = this.p[i] - Rw_i;
        }

        let H = 1.0;
        let k = 0;
        for (let m = 1; m <= this.Mb; m++) {
            H /= 2;
            let success = true;
            while (success && k < this.Nu) {
                success = false;
                for (let i = 0; i < this.N; i++) {
                    if (Math.abs(this.residual[i]) > (H * this.R[i][i] / 2)) {
                        const step = Math.sign(this.residual[i]) * H;
                        this.w[i] += step;
                        for (let j = 0; j < this.N; j++) {
                            this.residual[j] -= step * this.R[j][i];
                        }
                        k++;
                        success = true;
                        if (k >= this.Nu) break;
                    }
                }
            }
            if (k >= this.Nu) break;
        }
    }

    setParams(lambda, Mb, Nu) {
        this.lambda = lambda;
        this.Mb = Mb;
        this.Nu = Nu;
    }
}

// Signal Generator
class SignalGenerator {
    constructor() {
        this.n = 0;
        this.w_target = [0.5, -0.3];
    }

    setTarget(w1, w2) {
        this.w_target = [w1, w2];
    }

    next(noiseLevel = 0.01) {
        // System to identify (Unknown System)
        const w1 = this.w_target[0];
        const w2 = this.w_target[1];

        // Input x(n)
        const x = Math.sin(this.n * 0.1) + 0.5 * Math.sin(this.n * 0.25);
        this.lastX2 = this.lastX1 || 0;
        this.lastX1 = x;

        // Desired signal d(n)
        const pureD = w1 * this.lastX1 + w2 * this.lastX2;
        const noise = (Math.random() - 0.5) * 2 * noiseLevel;
        const d = pureD + noise;

        this.n++;
        return { x: [this.lastX1, this.lastX2], d, pureD };
    }
}
