'use strict';
// Counts are transcribed from source/appendix/exp_res.tex in Nature (2).zip.
// Every entry is a number of successes out of 120 evaluation trials.
// FERT and DAgger points are [number of training robots, number of successes].
// Human teleoperation pools six operators, with 20 trials per operator and task.
// Figure 2 labels Flower Arrangement as 8-FERT; 8 and 16 robots both score 119/120.
window.RESEARCH_DATA = {
  trials: 120,
  tasks: {
    packaging: {
      title: 'Phone Packaging', category: 'Long-horizon manipulation',
      description: 'Task description placeholder.',
      steps: ['Arrange the contents', 'Place the phone', 'Close the box'],
      media: 'Footage placeholder: a continuous overhead view of the complete packing sequence.',
      fert: [[4, 61], [8, 85], [16, 104], [32, 111], [64, 114], [96, 118]],
      dagger: [[1, 2], [4, 39], [8, 78], [16, 81]],
      human: 90, mainFertRobots: 96, initialLabel: 'Mixture DAgger',
      initial: 95, sft: 2, rlt: 102, recap: 90
    },
    flowers: {
      title: 'Flower Arrangement', category: 'Flexible objects & precise insertion',
      description: 'Task description placeholder.',
      steps: ['Pick up a stem', 'Align with the vase', 'Complete the arrangement'],
      media: 'Footage placeholder: close views of flexible stems, smooth transport, and insertion into the vase.',
      fert: [[4, 116], [8, 119], [16, 119]],
      dagger: [[1, 103], [4, 109], [8, 118]],
      human: 109, mainFertRobots: 8, initialRobots: 8, initialLabel: '8-robot DAgger',
      initial: 118, sft: 43, rlt: 114, recap: 114
    },
    folding: {
      title: 'Clothes Folding', category: 'Deformable-object manipulation',
      description: 'Task description placeholder.',
      steps: ['Grasp the fabric', 'Follow the fold sequence', 'Finish the folded shirt'],
      media: 'Footage placeholder: a top-down view showing the full T-shirt folding sequence and tabletop contact.',
      fert: [[4, 100], [8, 113], [16, 118]],
      dagger: [[1, 92], [4, 97], [8, 103]],
      human: 99, mainFertRobots: 16, initialRobots: 8, initialLabel: '8-robot DAgger',
      initial: 103, sft: 78, rlt: 106, recap: 110
    },
    charging: {
      title: 'Phone Charging', category: 'Precise alignment & contact control',
      description: 'Task description placeholder.',
      steps: ['Align the plug', 'Handle the cable', 'Place the phone'],
      media: 'Footage placeholder: close views of connector alignment, cable handling, and final phone placement.',
      fert: [[2, 48], [4, 108], [8, 114], [16, 117]],
      dagger: [[1, 1], [4, 71], [8, 71]],
      human: 86, mainFertRobots: 16, initialLabel: 'Mixture DAgger',
      initial: 72, sft: 19, rlt: 91, recap: 99
    },
    stool: {
      title: 'Stool Assembly', category: 'Small-object manipulation & tool use',
      description: 'Task description placeholder.',
      steps: ['Position two screws', 'Pick up the screwdriver', 'Align and tighten'],
      media: 'Footage placeholder: detailed views of screw placement, tool use, and alignment readjustments.',
      fert: [[8, 90], [16, 111], [32, 112]],
      dagger: [[1, 2], [4, 96], [8, 96], [16, 76]],
      human: 100, mainFertRobots: 32, initialLabel: 'Mixture DAgger',
      initial: 98, sft: 76, rlt: 97, recap: 102
    }
  }
};
