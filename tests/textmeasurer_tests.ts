// [VexFlow](http://vexflow.com) - Copyright (c) Mohit Muthanna 2010.
// Author: Tom Madams
// MIT License
//
// TextMeasurer tests

import { VexFlowTests, TestOptions } from './vexflow_test_helpers';
import { CanvasTextMeasurer, SVGTextMeasurer } from 'textmeasurer';

const TextMeasurerTests = {
  Start(): void {
    QUnit.module('TextMeasurer');
    test('Measurement test', measurement);
  },
};

// Verify that both the SVG and Canvas text measurers return similar values.
function measurement(): void {
  // The SVG element actually has to be appended to the document body for text
  // measuring to work.
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  document.body.append(svg);

  const svgMeasurer = new SVGTextMeasurer(svg);
  const canvasMeasurer = new CanvasTextMeasurer();

  const tests: [string, string, string, number][] = [
    ['Hello there', 'Arial', 'normal', 16],
    ['General Kenobi', 'Arial', 'normal', 16],
    ['', 'monospace', 'normal', 8],
    ['Back at the Chicken Shack', 'monospace', 'normal', 12],
    ['On Green Dolphin Street', 'times', 'bold', 12],
  ];

  for (const [text, family, weight, size] of tests) {
    const svgMeasure = svgMeasurer.measureText(text, family, size, weight);
    const canvasMeasure = canvasMeasurer.measureText(text, family, size, weight);
    const testName = `"${text}" ${family} ${weight} ${size}`;

    // Check the expected and computed bounding boxes are close enough.
    ok(
      Math.abs(svgMeasure.width - canvasMeasure.width) < 0.1,
      `${testName} : width mismatch : ${svgMeasure.width} !~ ${canvasMeasure.width}`
    );
    ok(
      Math.abs(svgMeasure.height - canvasMeasure.height) < 0.1,
      `${testName} : height mismatch : ${svgMeasure.height} !~ ${canvasMeasure.height}`
    );
  }

  document.body.removeChild(svg);
}

export { TextMeasurerTests };
