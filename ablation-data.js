'use strict';

// Exact trial counts: CEL (4).zip, source/appendix/exp_res.tex, tab:detail-abl.
// The shared full-FERT setting is specified in source/experiments/ablation.tex.
(() => {
  const full = {successes:104, robot1:53, robot2:51, baseline:true};
  const groups = [
    {
      key:'retrieval', title:'Failure-guided retrieval', axis:'Retrieval',
      settings:[
        {key:'without', label:'w/o FR', description:'Failure-guided retrieval disabled', successes:77, robot1:33, robot2:44},
        {key:'with', label:'w/ FR', description:'Failure-guided retrieval enabled', ...full}
      ]
    },
    {
      key:'synchronization', title:'Policy synchronization', axis:'Optimizer steps between synchronizations',
      settings:[
        {key:'100', label:'100', description:'Policy synchronized every 100 optimizer steps', successes:90, robot1:46, robot2:44},
        {key:'500', label:'500', description:'Policy synchronized every 500 optimizer steps', ...full},
        {key:'1500', label:'1500', description:'Policy synchronized every 1500 optimizer steps', successes:96, robot1:48, robot2:48}
      ]
    },
    {
      key:'context', title:'Retrieved context', axis:'Additional frames on each side',
      settings:[
        {key:'0', label:'0', description:'Retrieved intervals without context extension', successes:69, robot1:34, robot2:35},
        {key:'30', label:'30', description:'Retrieved intervals extended by 30 frames on each side', ...full}
      ]
    },
    {
      key:'retention', title:'Priority retention', axis:'Retention factor ρ',
      settings:[
        {key:'0.80', label:'0.80', description:'Priority retention factor 0.80', successes:85, robot1:44, robot2:41},
        {key:'0.88', label:'0.88', description:'Priority retention factor 0.88', ...full},
        {key:'0.95', label:'0.95', description:'Priority retention factor 0.95', successes:99, robot1:50, robot2:49}
      ]
    }
  ];
  groups.forEach(group => {
    group.settings.forEach(Object.freeze);
    Object.freeze(group.settings);
    Object.freeze(group);
  });
  window.ABLATION_DATA = Object.freeze({trials:120, robots:16, groups:Object.freeze(groups)});
})();
