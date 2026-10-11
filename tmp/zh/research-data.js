'use strict';
// Counts are verified against source/appendix/exp_res.tex in CEL.zip (2026-10-10).
// Every entry is a number of successes out of 120 evaluation trials.
// FERT and DAgger points are [number of training robots, number of successes].
// Human teleoperation pools six operators, with 20 trials per operator and task.
// Main results use 8-robot FERT for Flower Arrangement; 8 and 16 robots both score 119/120.
// Descriptions follow source/experiments/setup.tex and source/appendix/task_setup.tex.
window.RESEARCH_DATA = {
  trials: 120,
  tasks: {
    packaging: {
      title: "手机包装", category: "长时程操作",
      description: "机器人把说明书、充电线、充电器、手机壳和手机放入盒内，然后对齐并盖好盒盖。整个过程大约需要两到三分钟，每次摆放都很重要：一件物品的位置不对，就可能增加后续步骤的难度。",
      steps: ["整理盒内物品", "放入手机", "盖好盒盖"],
      media: "视频占位：从上方连续拍摄完整包装流程。",
      fert: [[4, 61], [8, 85], [16, 104], [32, 111], [64, 114], [96, 118]],
      dagger: [[1, 2], [4, 39], [8, 78], [16, 81]],
      human: 90, mainFertRobots: 96, initialLabel: "混合多机器人 HG-DAgger",
      initial: 95, sft: 2, rlt: 102, recap: 90
    },
    flowers: {
      title: "插花", category: "柔性物体与精确插入",
      description: "柔软的花茎在移向花瓶时会摇摆，增加插入的难度。机器人用左侧夹爪固定花瓶，再用右侧夹爪依次插入两朵花和一片叶子。整个过程都需要平稳移动和仔细对齐。",
      steps: ["夹取花茎", "对准花瓶", "完成插花"],
      media: "视频占位：展示柔软花茎、平稳移动和插入花瓶的近景。",
      fert: [[4, 116], [8, 119], [16, 119]],
      dagger: [[1, 103], [4, 109], [8, 118]],
      human: 109, mainFertRobots: 8, initialRobots: 8, initialLabel: "8 台机器人 HG-DAgger",
      initial: 118, sft: 43, rlt: 114, recap: 114
    },
    folding: {
      title: "衣物折叠", category: "可变形物体操作",
      description: "折叠会不断改变机器人正在处理的物体形状。这里，机器人先把 T 恤两侧向内折，再将衣服对折，最后用右侧夹爪抚平。大约 40 秒的流程结合了布料操作和与桌面的受控接触。",
      steps: ["抓取布料", "按顺序折叠", "完成 T 恤折叠"],
      media: "视频占位：俯拍完整 T 恤折叠流程及与桌面的接触。",
      fert: [[4, 100], [8, 113], [16, 118]],
      dagger: [[1, 92], [4, 97], [8, 103]],
      human: 99, mainFertRobots: 16, initialRobots: 8, initialLabel: "8 台机器人 HG-DAgger",
      initial: 103, sft: 78, rlt: 106, recap: 110
    },
    charging: {
      title: "手机充电", category: "精确对齐与接触控制",
      description: "微小的对齐误差，就可能让充电插头无法插入插线板。机器人需要对准并插入插头，然后从手机上拔下 Type-C 线，将手机放到盒子上。",
      steps: ["对准插头", "处理线缆", "放好手机"],
      media: "视频占位：展示接口对齐、线缆操作和手机最终摆放位置的近景。",
      fert: [[2, 48], [4, 108], [8, 114], [16, 117]],
      dagger: [[1, 1], [4, 71], [8, 71]],
      human: 86, mainFertRobots: 16, initialLabel: "混合多机器人 HG-DAgger",
      initial: 72, sft: 19, rlt: 91, recap: 99
    },
    stool: {
      title: "凳子组装", category: "小物体操作与工具使用",
      description: "小螺丝对对齐精度提出了较高要求。机器人将两颗螺丝放入凳子的孔位，拿起螺丝刀并拧紧。如果工具没有对准螺丝，就需要重新调整后再继续。",
      steps: ["放好两颗螺丝", "拿起螺丝刀", "对准并拧紧"],
      media: "视频占位：展示放置螺丝、使用工具和重新调整对齐的细节。",
      fert: [[8, 90], [16, 111], [32, 112]],
      dagger: [[1, 2], [4, 96], [8, 96], [16, 76]],
      human: 100, mainFertRobots: 32, initialLabel: "混合多机器人 HG-DAgger",
      initial: 98, sft: 76, rlt: 97, recap: 102
    }
  }
};
