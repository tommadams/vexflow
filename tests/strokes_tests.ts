// [VexFlow](http://vexflow.com) - Copyright (c) Mohit Muthanna 2010.
// MIT License
//
// Strokes Tests

import { TestOptions, VexFlowTests } from './vexflow_test_helpers';

import { Beam } from '../src/beam';
import { Bend } from '../src/bend';
import { GraceNote, GraceNoteStruct } from '../src/gracenote';
import { Barline } from '../src/stavebarline';
import { Stroke } from '../src/strokes';

const StrokesTests = {
  Start(): void {
    QUnit.module('Strokes');
    const run = VexFlowTests.runTests;
    // TODO: Rename tests by removing 'Strokes - ' since it is redundant with the module name.
    // This will make flow.html easier to read.
    run('Strokes - Brush/Roll/Rasquedo', brushRollRasquedo);
    run('Strokes - Arpeggio directionless (without arrows)', arpeggioDirectionless);
    run('Strokes - Multi Voice', multiVoice);
    run('Strokes - Notation and Tab', notesWithTab);
    run('Strokes - Multi-Voice Notation and Tab', multiNotationAndTab);
  },
};

function brushRollRasquedo(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 600, 200);
  const score = f.EasyScore();

  // bar 1
  const stave1 = f.Stave({ width: 250 }).setEndBarType(Barline.type.DOUBLE);

  const notes1 = score.notes('(a3 e4 a4)/4, (c4 e4 g4), (c4 e4 g4), (c4 e4 g4)', { stem: 'up' });

  notes1[0].addStroke(0, new Stroke(1));
  notes1[1]
    .addStroke(0, new Stroke(2))
    .addAccidental(1, f.Accidental({ type: '#' }))
    .addAccidental(2, f.Accidental({ type: '#' }))
    .addAccidental(0, f.Accidental({ type: '#' }));
  notes1[2].addStroke(0, new Stroke(1));
  notes1[3].addStroke(0, new Stroke(2));

  const voice1 = score.voice(notes1);

  f.Formatter().joinVoices([voice1]).formatToStave([voice1], stave1);

  // bar 2
  const stave2 = f
    .Stave({ x: stave1.getWidth() + stave1.getX(), y: stave1.getY(), width: 300 })
    .setEndBarType(Barline.type.DOUBLE);

  const notes2 = score.notes('(c4 d4 g4)/4, (c4 d4 g4), (c4 d4 g4), (c4 d4 a4)', { stem: 'up' });

  notes2[0].addStroke(0, new Stroke(3));
  notes2[1].addStroke(0, new Stroke(4));
  notes2[2].addStroke(0, new Stroke(5));
  notes2[3]
    .addStroke(0, new Stroke(6))
    .addAccidental(0, f.Accidental({ type: 'bb' }))
    .addAccidental(1, f.Accidental({ type: 'bb' }))
    .addAccidental(2, f.Accidental({ type: 'bb' }));

  const voice2 = score.voice(notes2);

  f.Formatter().joinVoices([voice2]).formatToStave([voice2], stave2);

  f.draw();

  ok(true, 'Brush/Roll/Rasquedo');
}

function arpeggioDirectionless(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 700, 200);
  const score = f.EasyScore();

  // bar 1
  const stave1 = f.Stave({ x: 100, width: 500 }).setEndBarType(Barline.type.DOUBLE);

  const notes1 = score.notes('(g4 b4 d5)/4, (g4 b4 d5 g5), (g4 b4 d5 g5), (g4 b4 d5)', { stem: 'up' });

  const graceNoteStructs: GraceNoteStruct[] = [
    { keys: ['e/4'], duration: '32' },
    { keys: ['f/4'], duration: '32' },
    { keys: ['g/4'], duration: '32' },
  ];
  const graceNotes: GraceNote[] = graceNoteStructs.map((graceNoteStruct) => f.GraceNote(graceNoteStruct));

  const graceNoteGroup = f.GraceNoteGroup({ notes: graceNotes, slur: false });
  graceNoteGroup.beamNotes();

  notes1[0].addStroke(0, new Stroke(7));
  notes1[1]
    .addStroke(0, new Stroke(7))
    .addAccidental(0, f.Accidental({ type: '#' }))
    .addAccidental(1, f.Accidental({ type: '#' }))
    .addAccidental(2, f.Accidental({ type: '#' }))
    .addAccidental(3, f.Accidental({ type: '#' }));
  notes1[2]
    .addStroke(0, new Stroke(7))
    .addAccidental(1, f.Accidental({ type: 'b' }))
    .addModifier(graceNoteGroup, 0);
  notes1[3].addStroke(0, new Stroke(7)).addModifier(
    f.NoteSubGroup({
      notes: [f.ClefNote({ type: 'treble', options: { size: 'default', annotation: '8va' } })],
    }),
    0
  );

  const voice1 = score.voice(notes1);

  f.Formatter().joinVoices([voice1]).formatToStave([voice1], stave1);

  f.draw();

  ok(true, 'Arpeggio directionless (without arrows)');
}

function multiVoice(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 500, 200);
  const score = f.EasyScore();
  const stave = f.Stave();

  const notes1 = score.notes('(c4 e4 g4)/4, (c4 e4 g4), (c4 d4 a4), (c4 d4 a4)', { stem: 'up' });

  notes1[0].addStroke(0, new Stroke(5));
  notes1[1]
    .addStroke(0, new Stroke(6))
    .addAccidental(0, f.Accidental({ type: '#' }))
    .addAccidental(2, f.Accidental({ type: '#' }));
  notes1[2].addStroke(0, new Stroke(2));
  notes1[3].addStroke(0, new Stroke(1));

  const notes2 = score.notes('e3/8, e3, e3, e3, e3, e3, e3, e3', { stem: 'down' });

  f.Beam({ notes: notes2.slice(0, 4) });
  f.Beam({ notes: notes2.slice(4, 8) });

  const voices = [notes1, notes2].map((notes) => score.voice(notes));

  f.Formatter().joinVoices(voices).formatToStave(voices, stave);

  f.draw();

  ok(true, 'Strokes Test Multi Voice');
}

function multiNotationAndTab(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 400, 275);
  const score = f.EasyScore();
  const stave = f.Stave().addClef('treble');

  // notation upper voice notes
  const notes1 = score.notes('(g4 b4 e5)/4, (g4 b4 e5), (g4 b4 e5), (g4 b4 e5)', { stem: 'up' });

  notes1[0].addStroke(0, new Stroke(3, { all_voices: false }));
  notes1[1].addStroke(0, new Stroke(6));
  notes1[2].addStroke(0, new Stroke(2, { all_voices: false }));
  notes1[3].addStroke(0, new Stroke(1));

  const notes2 = score.notes('g3/4, g3, g3, g3', { stem: 'down' });

  f.TabStave({ y: 100 }).addClef('tab').setNoteStartX(stave.getNoteStartX());

  // tablature upper voice notes
  const tabNotes1 = [
    f.TabNote({
      positions: [
        { str: 3, fret: 0 },
        { str: 2, fret: 0 },
        { str: 1, fret: 1 },
      ],
      duration: '4',
    }),
    f.TabNote({
      positions: [
        { str: 3, fret: 0 },
        { str: 2, fret: 0 },
        { str: 1, fret: 1 },
      ],
      duration: '4',
    }),
    f.TabNote({
      positions: [
        { str: 3, fret: 0 },
        { str: 2, fret: 0 },
        { str: 1, fret: 1 },
      ],
      duration: '4',
    }),
    f.TabNote({
      positions: [
        { str: 3, fret: 0 },
        { str: 2, fret: 0 },
        { str: 1, fret: 1 },
      ],
      duration: '4',
    }),
  ];

  tabNotes1[0].addStroke(0, new Stroke(3, { all_voices: false }));
  tabNotes1[1].addStroke(0, new Stroke(6));
  tabNotes1[2].addStroke(0, new Stroke(2, { all_voices: false }));
  tabNotes1[3].addStroke(0, new Stroke(1));

  const tabNotes2 = [
    f.TabNote({ positions: [{ str: 6, fret: 3 }], duration: '4' }),
    f.TabNote({ positions: [{ str: 6, fret: 3 }], duration: '4' }),
    f.TabNote({ positions: [{ str: 6, fret: 3 }], duration: '4' }),
    f.TabNote({ positions: [{ str: 6, fret: 3 }], duration: '4' }),
  ];

  const voices = [notes1, notes2, tabNotes1, tabNotes2].map((notes) => score.voice(notes));

  f.Formatter().joinVoices(voices).formatToStave(voices, stave);

  f.draw();

  ok(true, 'Strokes Test Notation & Tab Multi Voice');
}

/*
function drawTabStrokes(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 600, 200);
  const stave1 = f.TabStave({ width: 250 }).setEndBarType(Barline.type.DOUBLE);

  const tabNotes1 = [
    f.TabNote({
      positions: [
        { str: 2, fret: 8 },
        { str: 3, fret: 9 },
        { str: 4, fret: 10 },
      ],
      duration: '4',
    }),
    f.TabNote({
      positions: [
        { str: 3, fret: 7 },
        { str: 4, fret: 8 },
        { str: 5, fret: 9 },
      ],
      duration: '4',
    }),
    f.TabNote({
      positions: [
        { str: 1, fret: 5 },
        { str: 2, fret: 6 },
        { str: 3, fret: 7 },
        { str: 4, fret: 7 },
        { str: 5, fret: 5 },
        { str: 6, fret: 5 },
      ],
      duration: '4',
    }),
    f.TabNote({
      positions: [
        { str: 4, fret: 3 },
        { str: 5, fret: 4 },
        { str: 6, fret: 5 },
      ],
      duration: '4',
    }),
  ];

  tabNotes1[0].addStroke(0, new Stroke(1));
  tabNotes1[1].addStroke(0, new Stroke(2));
  tabNotes1[2].addStroke(0, new Stroke(3));
  tabNotes1[3].addStroke(0, new Stroke(4));

  const tabVoice1 = f.Voice().addTickables(tabNotes1);

  f.Formatter().joinVoices([tabVoice1]).formatToStave([tabVoice1], stave1);

  // bar 2
  const stave2 = f.TabStave({ x: stave1.getWidth() + stave1.getX(), width: 300 }).setEndBarType(Barline.type.DOUBLE);

  const tabNotes2 = [
    f.TabNote({
      positions: [
        { str: 2, fret: 7 },
        { str: 3, fret: 8 },
        { str: 4, fret: 9 },
      ],
      duration: '2',
    }),
    f.TabNote({
      positions: [
        { str: 1, fret: 5 },
        { str: 2, fret: 6 },
        { str: 3, fret: 7 },
        { str: 4, fret: 7 },
        { str: 5, fret: 5 },
        { str: 6, fret: 5 },
      ],
      duration: '2',
    }),
  ];

  tabNotes2[0].addStroke(0, new Stroke(6));
  tabNotes2[1].addStroke(0, new Stroke(5));

  const tabVoice2 = f.Voice().addTickables(tabNotes2);

  f.Formatter().joinVoices([tabVoice2]).formatToStave([tabVoice2], stave2);

  f.draw();

  ok(true, 'Strokes Tab test');
}
*/

function notesWithTab(options: TestOptions): void {
  const f = VexFlowTests.makeFactory(options, 500, 300);

  const stave = f.Stave({ x: 15, y: 40, width: 450 }).addClef('treble');

  const notes = [
    f
      .StaveNote({ keys: ['b/4', 'd/5', 'g/5'], stem_direction: -1, duration: '4' })
      .addAccidental(1, f.Accidental({ type: 'b' }))
      .addAccidental(0, f.Accidental({ type: 'b' })),
    f.StaveNote({ keys: ['c/5', 'd/5'], stem_direction: -1, duration: '4' }),
    f.StaveNote({ keys: ['b/3', 'e/4', 'a/4', 'd/5'], stem_direction: 1, duration: '8' }),
    f
      .StaveNote({ keys: ['a/3', 'e/4', 'a/4', 'c/5', 'e/5', 'a/5'], stem_direction: 1, duration: '8' })
      .addAccidental(3, f.Accidental({ type: '#' })),
    f.StaveNote({ keys: ['b/3', 'e/4', 'a/4', 'd/5'], stem_direction: 1, duration: '8' }),
    f
      .StaveNote({ keys: ['a/3', 'e/4', 'a/4', 'c/5', 'f/5', 'a/5'], stem_direction: 1, duration: '8' })
      .addAccidental(3, f.Accidental({ type: '#' }))
      .addAccidental(4, f.Accidental({ type: '#' })),
  ];

  const tabstave = f
    .TabStave({ x: stave.getX(), y: 140, width: 450 })
    .addClef('tab')
    .setNoteStartX(stave.getNoteStartX());

  const tabNotes = [
    f
      .TabNote({
        positions: [
          { str: 1, fret: 3 },
          { str: 2, fret: 2 },
          { str: 3, fret: 3 },
        ],
        duration: '4',
      })
      .addModifier(new Bend('Full'), 0),
    f
      .TabNote({
        positions: [
          { str: 2, fret: 3 },
          { str: 3, fret: 5 },
        ],
        duration: '4',
      })
      .addModifier(new Bend('Unison'), 1),
    f.TabNote({
      positions: [
        { str: 3, fret: 7 },
        { str: 4, fret: 7 },
        { str: 5, fret: 7 },
        { str: 6, fret: 7 },
      ],
      duration: '8',
    }),
    f.TabNote({
      positions: [
        { str: 1, fret: 5 },
        { str: 2, fret: 5 },
        { str: 3, fret: 6 },
        { str: 4, fret: 7 },
        { str: 5, fret: 7 },
        { str: 6, fret: 5 },
      ],
      duration: '8',
    }),
    f.TabNote({
      positions: [
        { str: 3, fret: 7 },
        { str: 4, fret: 7 },
        { str: 5, fret: 7 },
        { str: 6, fret: 7 },
      ],
      duration: '8',
    }),
    f.TabNote({
      positions: [
        { str: 1, fret: 5 },
        { str: 2, fret: 5 },
        { str: 3, fret: 6 },
        { str: 4, fret: 7 },
        { str: 5, fret: 7 },
        { str: 6, fret: 5 },
      ],
      duration: '8',
    }),
  ];

  notes[0].addStroke(0, new Stroke(1));
  notes[1].addStroke(0, new Stroke(2));
  notes[2].addStroke(0, new Stroke(3));
  notes[3].addStroke(0, new Stroke(4));
  notes[4].addStroke(0, new Stroke(5));
  notes[5].addStroke(0, new Stroke(6));

  tabNotes[0].addStroke(0, new Stroke(1));
  tabNotes[1].addStroke(0, new Stroke(2));
  tabNotes[2].addStroke(0, new Stroke(3));
  tabNotes[3].addStroke(0, new Stroke(4));
  tabNotes[4].addStroke(0, new Stroke(5));
  tabNotes[5].addStroke(0, new Stroke(6));

  f.StaveConnector({
    top_stave: stave,
    bottom_stave: tabstave,
    type: 'bracket',
  });

  f.StaveConnector({
    top_stave: stave,
    bottom_stave: tabstave,
    type: 'single',
  });

  const voice = f.Voice().addTickables(notes);
  const tabVoice = f.Voice().addTickables(tabNotes);
  const beams = Beam.applyAndGetBeams(voice);

  f.Formatter().joinVoices([voice]).joinVoices([tabVoice]).formatToStave([voice, tabVoice], stave);

  f.draw();

  beams.forEach(function (beam) {
    beam.setContext(f.getContext()).draw();
  });

  ok(true);
}

export { StrokesTests };
