pragma circom 2.0.0;

include "../../../node_modules/circomlib/circuits/comparators.circom";

template PersonPresent() {
    // Private inputs
    signal input x;
    signal input y;

    // Public inputs (boundaries)
    signal input minX;
    signal input maxX;
    signal input minY;
    signal input maxY;

    // Outputs
    signal output isInside;

    // Comparators (using 32-bit integer size for coordinates)
    component gteMinX = GreaterEqThan(32);
    gteMinX.in[0] <== x;
    gteMinX.in[1] <== minX;

    component lteMaxX = LessEqThan(32);
    lteMaxX.in[0] <== x;
    lteMaxX.in[1] <== maxX;

    component gteMinY = GreaterEqThan(32);
    gteMinY.in[0] <== y;
    gteMinY.in[1] <== minY;

    component lteMaxY = LessEqThan(32);
    lteMaxY.in[0] <== y;
    lteMaxY.in[1] <== maxY;

    // Constraints: all comparisons must evaluate to 1 (true)
    gteMinX.out === 1;
    lteMaxX.out === 1;
    gteMinY.out === 1;
    lteMaxY.out === 1;

    isInside <== 1;
}

component main {public [minX, maxX, minY, maxY]} = PersonPresent();
