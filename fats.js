(() => {
  'use strict';
  const root=document.getElementById('fats-framework');if(!root)return;
  const zh=root.dataset.locale==='zh', reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const copy={
    robots:[['Robot interaction','Three robot groups connect through tier-2 switches, with capacities of 40, 40 and 20. The largest training run evaluated in the paper used 96 robots.'],['机器人交互','三组机器人通过二级交换机接入，容量分别为 40、40 和 20 台。论文评测的最大训练群体使用 96 台机器人。']],
    edge:[['Inference at the edge','50 NVIDIA RTX 4090 edge nodes serve two robots each. The three groups contain 20, 20 and 10 nodes. SwarmLink shares inference requests among available workers near the robots.'],['边缘侧策略推理','50 个 NVIDIA RTX 4090 边缘节点每个服务两台机器人，三组分别为 20、20 和 10 个节点。SwarmLink 将推理请求分配给机器人附近可用的工作进程。']],
    network:[['Two tiers of switches','Two tier-1 switches connect three tier-2 switches. Inter-switch connections use dual 100 Gbps links, as marked in the figure.'],['两级交换网络','两台一级交换机连接三台二级交换机。交换机之间采用图例标出的双路 100 Gbps 链路。']],
    cloud:[['Optimization in the cloud','A dedicated 30 Gbps connection carries experience and policy updates between the edge and cloud. Six cloud servers provide 48 NVIDIA A800 GPUs for optimization.'],['云端策略优化','经验与策略更新通过专用的 30 Gbps 链路在边缘侧和云端之间传输。六台云服务器提供 48 块 NVIDIA A800 GPU，用于策略优化。']],
    nas:[['Shared storage at the edge','Network-attached storage connects to the first tier-1 switch. It provides shared storage for the edge-side system.'],['边缘侧共享存储','网络附加存储连接到第一台一级交换机，为边缘侧系统提供共享存储。']]
  };
  const nodes=[...root.querySelectorAll('[data-node]')];let selected=null,visible=false;
  function highlight(key){
    nodes.forEach(node=>node.classList.toggle('is-active',node.dataset.node===key));
    root.querySelectorAll('[data-route]').forEach(path=>path.classList.toggle('is-active',key===null||path.dataset.route===key));
  }
  function select(key){
    selected=key;highlight(key);
    nodes.forEach(node=>node.setAttribute('aria-pressed',String(node.dataset.node===key)));
    const entry=copy[key][zh?1:0];root.querySelector('#fats-detail-title').textContent=entry[0];root.querySelector('#fats-detail-copy').textContent=entry[1];
  }
  nodes.forEach(node=>{
    node.addEventListener('click',()=>select(node.dataset.node));
    node.addEventListener('pointerenter',()=>highlight(node.dataset.node));
    node.addEventListener('pointerleave',()=>highlight(selected));
    node.addEventListener('focus',()=>highlight(node.dataset.node));
    node.addEventListener('blur',()=>highlight(selected));
    if(node.tagName.toLowerCase()==='g')node.addEventListener('keydown',event=>{
      if(['Enter',' '].includes(event.key)){event.preventDefault();select(node.dataset.node);}
    });
  });
  function motion(){root.classList.toggle('is-live',visible&&!document.hidden&&!reduced.matches);}
  if('IntersectionObserver' in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;motion();},{threshold:.1}).observe(root);
  else{visible=true;motion();}
  document.addEventListener('visibilitychange',motion);reduced.addEventListener('change',motion);
  highlight(null);
})();
