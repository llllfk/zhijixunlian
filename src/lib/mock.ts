import { EvalResult, DialogueMsg, RADAR_DIMENSIONS } from './types';

interface Script {
  name: string;
  /** 旅客（「旅客陪练」智能体扮演）的台词 */
  passengerLines: string[];
}

// mock 阶段脚本：键为画像名称
const SCRIPTS: Record<string, Script> = {
  普通成人: {
    name: '普通成人',
    passengerLines: [
      '你好，我来办理值机。',
      '这是我的身份证，帮我看看。',
      '可以的话要个靠窗的位置。',
      '我手上这箱子挺大的，能直接带上飞机吗？',
      '好的，那麻烦你帮我托运吧。',
      '谢谢你，安排得挺周到。',
    ],
  },
  急脾气: {
    name: '急脾气',
    passengerLines: [
      '快点快点，我赶时间！我前面怎么这么多人？',
      '喏，身份证，赶紧的。',
      '我要坐靠窗的，登机口近一点的最好。',
      '我充电宝在随身包里，这总没问题吧？别给我找麻烦。',
      '你到底弄好没有？我都约了人到机场接我。',
    ],
  },
  老年旅客: {
    name: '老年旅客',
    passengerLines: [
      '姑娘，你好，我第一次坐，这个值机是什么意思呀？',
      '我耳朵有点背，你说慢一点。这是我身份证。',
      '位置我就坐靠窗的吧，我要看看风景。',
      '什么托运？我这包要放哪去？会不会丢？',
      '哦……好，那你帮我仔细看看，别弄错了。',
    ],
  },
  行李敏感: {
    name: '行李敏感',
    passengerLines: [
      '你好，麻烦帮我办值机，我这箱子和这袋子都要一起托运。',
      '你可给我轻拿轻放，里面都是易碎品。',
      '我这里面有瓶装水，还有把剪刀，能托运吧？',
      '真的不会有破损吗？上次我朋友行李就被摔坏了。',
      '那你们损坏了要赔偿的吧？帮我写清楚点。',
    ],
  },
  首次乘机: {
    name: '首次乘机',
    passengerLines: [
      '你好，我第一次坐飞机，有点紧张。',
      '身份证……对，在这里。我需要做什么呀？',
      '什么座位？靠窗靠过道我都不太懂，你帮我挑一个吧。',
      '那我可以带水进去吗？还有我包里有个充电宝。',
      '登机牌是干什么的？我待会要去哪？我有点慌。',
    ],
  },
};

/** 获取某画像的 mock 旅客台词，未匹配时用默认脚本 */
export function getMockScript(profileName?: string | null): Script {
  if (profileName && SCRIPTS[profileName]) return SCRIPTS[profileName];
  return {
    name: '普通旅客',
    passengerLines: [
      '你好，我来办一下值机。',
      '好的，这是我的身份证。',
      '就靠窗的位子吧。',
      '这箱子可以带上飞机吗？',
      '谢谢你，没有别的了。',
    ],
  };
}

/** 生成一份 mock 训练评价（结构化，供总结页展示，等接入「训练评价」智能体后替换为真实结果） */
export function mockEval(dialogue: DialogueMsg[], _profileName?: string | null): EvalResult {
  const dims: Record<string, number> = {
    礼仪问候: 92,
    证件与客票核对: 85,
    服务信息确认: 80,
    行李与危险品提示: 88,
    座位与登机牌唱票: 78,
    表达与应变: 86,
  };
  return {
    total_score: Math.round(Object.values(dims).reduce((a, b) => a + b, 0) / RADAR_DIMENSIONS.length),
    dimensions: dims as EvalResult['dimensions'],
    suggestions: [
      '问候语清晰、有亲和力，继续保持主动迎宾。',
      '证件与客票核对环节建议加入"报读旅客姓名核对"以降低错运风险。',
      '针对该画像，行李环节应主动提示危险品、贵重物品与易碎品。',
      '唱票时放慢语速、逐项确认登机口、座位号与登机时间，减少旅客重复问询。',
      '遇到特殊旅客保持耐心，可用复述确认的方式确保信息无误。',
    ],
    transcript: dialogue,
  };
}