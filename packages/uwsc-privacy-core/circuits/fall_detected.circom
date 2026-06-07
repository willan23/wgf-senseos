pragma circom 2.0.0;

include "../../../node_modules/circomlib/circuits/comparators.circom";

template FallDetected() {
    // Private inputs
    signal input impactEnergy;
    signal input postActivity;

    // Public inputs
    signal input impactThreshold;

    // Outputs
    signal output isFall;

    // 1. Proves impactEnergy >= impactThreshold
    component gteThreshold = GreaterEqThan(32);
    gteThreshold.in[0] <== impactEnergy;
    gteThreshold.in[1] <== impactThreshold;
    gteThreshold.out === 1;

    // 2. Proves postActivity < 10% of impactThreshold.
    // In Circom, we avoid division to prevent precision loss.
    // Thus: postActivity < impactThreshold / 10 is verified as:
    // 10 * postActivity < impactThreshold.
    signal tenPostActivity;
    tenPostActivity <== 10 * postActivity;

    component ltThreshold = LessThan(32);
    ltThreshold.in[0] <== tenPostActivity;
    ltThreshold.in[1] <== impactThreshold;
    ltThreshold.out === 1;

    isFall <== 1;
}

component main {public [impactThreshold]} = FallDetected();
