// [VexFlow](http://vexflow.com) - Copyright (c) Mohit Muthanna 2010.
// MIT License
//
// TimeSignature Tests

import { TestOptions, VexFlowTests } from './vexflow_test_helpers';

import { ContextBuilder } from '../src/renderer';
import { Stave, StaveLineConfig } from '../src/stave';
import { StaveConnector } from '../src/staveconnector';
import { TimeSignature } from '../src/timesignature';

const TimeSignatureTests = {
  Start(): void {
    QUnit.module('TimeSignature');
    test('Time Signature Parser', parser);
    const run = VexFlowTests.runTests;
    run('Basic Time Signatures', basic);
    run('Big Signature Test', big);
    run('Time Signature multiple staves alignment test', multiple);
    run('Time Signature Change Test', change);
  },
};

function parser(): void {
  const timeSig = new TimeSignature();

  const mustFail = ['asdf', '123/', '/10', '/', '4567', 'C+'];
  mustFail.forEach((invalidString) => {
    throws(() => timeSig.parseTimeSpec(invalidString), /BadTimeSignature/);
  });

  const mustPass = ['4/4', '10/12', '1/8', '1234567890/1234567890', 'C', 'C|'];
  mustPass.forEach((validString) => timeSig.parseTimeSpec(validString));

  ok(true, 'all pass');
}

function basic(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 600, 120);

  new Stave(10, 10, 500)
    .addTimeSignature('2/2')
    .addTimeSignature('3/4')
    .addTimeSignature('4/4')
    .addTimeSignature('6/8')
    .addTimeSignature('C')
    .addTimeSignature('C|')
    .addEndTimeSignature('2/2')
    .addEndTimeSignature('3/4')
    .addEndTimeSignature('4/4')
    .addEndClef('treble')
    .addEndTimeSignature('6/8')
    .addEndTimeSignature('C')
    .addEndTimeSignature('C|')
    .setContext(ctx)
    .draw();

  ok(true, 'all pass');
}

function big(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 400, 120);

  new Stave(10, 10, 300)
    .addTimeSignature('12/8')
    .addTimeSignature('7/16')
    .addTimeSignature('1234567/890')
    .addTimeSignature('987/654321')
    .setContext(ctx)
    .draw();

  ok(true, 'all pass');
}

function multiple(options: TestOptions, contextBuilder: ContextBuilder): void {
  const ctx = contextBuilder(options.elementId, 400, 350);

  // Each StaveLineConfig object is of the form { visible: boolean }.
  const stave1LineConfig: StaveLineConfig[] = [false, false, true, false, false].map((visible) => ({ visible }));
  const stave1 = new Stave(15, 0, 300)
    .setConfigForLines(stave1LineConfig)
    .addClef('percussion')
    .addTimeSignature('4/4', 25) // passing the custom padding in pixels
    .setContext(ctx)
    .draw();
  const stave2 = new Stave(15, 110, 300).addClef('treble').addTimeSignature('4/4').setContext(ctx).draw();
  const stave3 = new Stave(15, 220, 300).addClef('bass').addTimeSignature('4/4').setContext(ctx).draw();

  new StaveConnector(stave1, stave2).setType('single').setContext(ctx).draw();
  new StaveConnector(stave2, stave3).setType('single').setContext(ctx).draw();
  new StaveConnector(stave2, stave3).setType('brace').setContext(ctx).draw();

  ok(true, 'all pass');
}

function change(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 900);
  const stave = f.Stave({ x: 0, y: 0 }).addClef('treble').addTimeSignature('C|');

  const tickables = [
    f.StaveNote({ keys: ['c/4'], duration: '4', clef: 'treble' }),
    f.TimeSigNote({ time: '3/4' }),
    f.StaveNote({ keys: ['d/4'], duration: '4', clef: 'alto' }),
    f.StaveNote({ keys: ['b/3'], duration: '4r', clef: 'alto' }),
    f.TimeSigNote({ time: 'C' }),
    f.StaveNote({ keys: ['c/3', 'e/3', 'g/3'], duration: '4', clef: 'bass' }),
    f.TimeSigNote({ time: '9/8' }),
    f.StaveNote({ keys: ['c/4'], duration: '4', clef: 'treble' }),
  ];
  const voice = f.Voice().setStrict(false).addTickables(tickables);

  f.Formatter().joinVoices([voice]).formatToStave([voice], stave);
  f.draw();

  ok(true, 'all pass');
}

export { TimeSignatureTests };
