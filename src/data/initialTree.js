const initialTree = {
  choose_opener: {
    id: 'choose_opener',
    label: 'Choose opener',
    scriptText: 'Pick an opener style for this call:',
    isOpenerChoice: true,
    options: [
      {
        buttonLabel: 'A: Permission-based',
        targetNodeId: 'opener_a',
      },
      {
        buttonLabel: 'B: Warm / familiar',
        targetNodeId: 'opener_b',
      },
      {
        buttonLabel: 'C: Direct value prop',
        targetNodeId: 'opener_c',
      },
      {
        buttonLabel: 'D: Personalized trigger',
        targetNodeId: 'opener_d',
      },
    ],
  },
  opener_a: {
    id: 'opener_a',
    label: 'Opener A: Permission-based',
    scriptText: "Hey, this is Antonette with SerraFi Bank. This is a cold call, so you can totally hang up or give me 20 seconds to tell you why I called.",
    options: [
      { buttonLabel: 'They give you time', targetNodeId: 'pitch' },
      { buttonLabel: 'Hard no / hang up', targetNodeId: 'hard_no' },
      { buttonLabel: 'Gatekeeper picks up', targetNodeId: 'gatekeeper' },
    ],
  },
  opener_b: {
    id: 'opener_b',
    label: 'Opener B: Warm / familiar',
    scriptText: "Hey, this is Antonette with SerraFi Bank. How've you been?",
    options: [
      { buttonLabel: 'They respond / engage', targetNodeId: 'pitch' },
      { buttonLabel: 'Hard no / hang up', targetNodeId: 'hard_no' },
      { buttonLabel: 'Gatekeeper picks up', targetNodeId: 'gatekeeper' },
    ],
  },
  opener_c: {
    id: 'opener_c',
    label: 'Opener C: Direct value prop',
    scriptText: "Hey, this is Antonette with SerraFi Bank. The reason I'm calling is we have a debit card that earns 1.5% back on tax payments, and I wanted to see if that's something worth a quick look.",
    options: [
      { buttonLabel: 'Tell me more', targetNodeId: 'tell_more' },
      { buttonLabel: 'How does that work with taxes?', targetNodeId: 'taxes_question' },
      { buttonLabel: 'We already have a bank', targetNodeId: 'already_have_bank' },
      { buttonLabel: "What's the catch / Is there a fee?", targetNodeId: 'whats_the_catch' },
      { buttonLabel: "That's not my area / Talk to my CFO", targetNodeId: 'not_my_area' },
      { buttonLabel: 'Send me something', targetNodeId: 'send_something' },
      { buttonLabel: "We don't pay much in taxes / We're a nonprofit", targetNodeId: 'low_taxes' },
      { buttonLabel: 'Silence / hesitation', targetNodeId: 'silence' },
      { buttonLabel: 'Hard no', targetNodeId: 'hard_no' },
      { buttonLabel: 'Gatekeeper picks up', targetNodeId: 'gatekeeper' },
    ],
  },
  opener_d: {
    id: 'opener_d',
    label: 'Opener D: Personalized trigger',
    scriptText: "Hey, this is Antonette with SerraFi. I saw you guys just [raised a round / opened a new location / hired a new CFO]. The reason I'm calling is we help companies like yours earn cashback on spend you're already doing. Got 30 seconds?",
    options: [
      { buttonLabel: 'They give you time', targetNodeId: 'pitch' },
      { buttonLabel: 'Tell me more', targetNodeId: 'tell_more' },
      { buttonLabel: 'Hard no / hang up', targetNodeId: 'hard_no' },
      { buttonLabel: 'Gatekeeper picks up', targetNodeId: 'gatekeeper' },
    ],
  },
  pitch: {
    id: 'pitch',
    label: 'Pitch',
    scriptText: "We're offering a debit card that earns 1.5% cashback on state and federal corporate taxes, and I was just reaching out to see if it might be worth exploring alongside your current banking.",
    options: [
      { buttonLabel: 'Tell me more', targetNodeId: 'tell_more' },
      { buttonLabel: 'How does that work with taxes?', targetNodeId: 'taxes_question' },
      { buttonLabel: 'We already have a bank', targetNodeId: 'already_have_bank' },
      { buttonLabel: "What's the catch / Is there a fee?", targetNodeId: 'whats_the_catch' },
      { buttonLabel: "That's not my area / Talk to my CFO", targetNodeId: 'not_my_area' },
      { buttonLabel: 'Send me something', targetNodeId: 'send_something' },
      { buttonLabel: "We don't pay much in taxes / We're a nonprofit", targetNodeId: 'low_taxes' },
      { buttonLabel: 'Silence / hesitation', targetNodeId: 'silence' },
      { buttonLabel: 'Hard no', targetNodeId: 'hard_no' },
      { buttonLabel: 'Gatekeeper picks up', targetNodeId: 'gatekeeper' },
    ],
  },
  tell_more: {
    id: 'tell_more',
    label: 'Tell me more',
    scriptText: "Sure. It works just like a regular business debit card but you earn 1.5% back on everything you spend. Taxes are the big one because the dollars are so large and can't usually be paid with a credit card, but it also covers vendor payments, utilities, basically anything. Would it make sense to do a 15-minute call to walk through how it works? We're still at an early stage so if you hop on a call you'd actually be talking to our CEO directly.",
    options: [
      { buttonLabel: 'They agree to a meeting', targetNodeId: 'book_meeting' },
      { buttonLabel: 'Send me something first', targetNodeId: 'send_something' },
      { buttonLabel: "We don't use cards", targetNodeId: 'dont_use_cards' },
      { buttonLabel: 'Not interested', targetNodeId: 'hard_no' },
    ],
  },
  taxes_question: {
    id: 'taxes_question',
    label: 'How does that work with taxes?',
    scriptText: "You pay through the normal tax payment portals with the SerraFi debit card. The 1.5% comes back to you automatically. For most companies that's thousands back on payments you're already making. We're still early, so on a call you'd be talking directly with our CEO if you have 15 minutes this week?",
    options: [
      { buttonLabel: 'They agree to a meeting', targetNodeId: 'book_meeting' },
      { buttonLabel: 'Send me something first', targetNodeId: 'send_something' },
      { buttonLabel: 'Not interested', targetNodeId: 'hard_no' },
    ],
  },
  already_have_bank: {
    id: 'already_have_bank',
    label: 'We already have a bank',
    scriptText: "Totally, this isn't about replacing your bank. Most of our customers keep their primary banking and just run spend through SerraFi to capture the cashback. Think of it as an add-on, not a switch. We're still early, so on a call you'd be talking directly with our CEO if you have 15 minutes this week?",
    options: [
      { buttonLabel: "They're interested now", targetNodeId: 'tell_more' },
      { buttonLabel: 'Send me something', targetNodeId: 'send_something' },
      { buttonLabel: 'Not interested', targetNodeId: 'hard_no' },
    ],
  },
  whats_the_catch: {
    id: 'whats_the_catch',
    label: "What's the catch / Is there a fee?",
    scriptText: "No annual fee, no minimum balance. It's a straightforward debit card. We make money on interchange, you make money on cashback. That's it.",
    options: [
      { buttonLabel: 'They want to hear more', targetNodeId: 'tell_more' },
      { buttonLabel: 'They agree to a meeting', targetNodeId: 'book_meeting' },
      { buttonLabel: 'Send me something', targetNodeId: 'send_something' },
      { buttonLabel: 'Not interested', targetNodeId: 'hard_no' },
    ],
  },
  not_my_area: {
    id: 'not_my_area',
    label: "That's not my area / Talk to my CFO",
    scriptText: "Makes total sense. Who would be the right person to talk to about this? I'm happy to send them a one-pager so they have context before we connect.",
    options: [
      { buttonLabel: 'They give a name/contact', targetNodeId: 'got_referral' },
      { buttonLabel: "They won't share", targetNodeId: 'call_over' },
    ],
  },
  send_something: {
    id: 'send_something',
    label: 'Send me something',
    scriptText: "Happy to. What's your email?",
    options: [
      { buttonLabel: 'They give email + engage', targetNodeId: 'book_meeting' },
      { buttonLabel: "They give email but won't engage further", targetNodeId: 'follow_up_later' },
      { buttonLabel: "They won't give email", targetNodeId: 'call_over' },
    ],
  },
  low_taxes: {
    id: 'low_taxes',
    label: "We don't pay much in taxes / We're a nonprofit",
    scriptText: "That's fine, taxes are just one piece. The 1.5% applies to everything: vendor payments, subscriptions, supplies. What's your biggest spending category?",
    options: [
      { buttonLabel: 'They share spending info', targetNodeId: 'tell_more' },
      { buttonLabel: 'Not interested', targetNodeId: 'hard_no' },
    ],
  },
  silence: {
    id: 'silence',
    label: 'Silence / hesitation',
    scriptText: "I know it sounds almost too simple. The basic idea is you're already spending this money, we just make sure you're earning something back on it. We're just getting started, you'd actually get to talk with our CEO directly if you want to set up 15 minutes next week.",
    options: [
      { buttonLabel: 'They engage', targetNodeId: 'tell_more' },
      { buttonLabel: 'They agree to a meeting', targetNodeId: 'book_meeting' },
      { buttonLabel: 'Not interested', targetNodeId: 'hard_no' },
    ],
  },
  hard_no: {
    id: 'hard_no',
    label: 'Hard no',
    scriptText: "No worries at all. Mind if I ask, is it timing, or is this just not relevant for you guys right now?",
    options: [
      { buttonLabel: "It's timing, try back later", targetNodeId: 'follow_up_later' },
      { buttonLabel: 'Not relevant', targetNodeId: 'call_over' },
    ],
  },
  gatekeeper: {
    id: 'gatekeeper',
    label: 'Gatekeeper picks up',
    scriptText: "Hi, I'm trying to reach whoever handles accounts payable or vendor payments. Who would that be?",
    options: [
      { buttonLabel: 'They transfer/give a name', targetNodeId: 'choose_opener' },
      { buttonLabel: "They won't help", targetNodeId: 'call_over' },
    ],
  },
  dont_use_cards: {
    id: 'dont_use_cards',
    label: "We don't use cards",
    scriptText: "That's actually most of our customers before they switched. The whole point is capturing money you're leaving on the table right now. Worth a 15-minute look?",
    options: [
      { buttonLabel: 'They agree', targetNodeId: 'book_meeting' },
      { buttonLabel: 'Not interested', targetNodeId: 'hard_no' },
    ],
  },
  book_meeting: {
    id: 'book_meeting',
    label: 'Book meeting',
    scriptText: "Great. How's [suggest a specific day]? I'll send over a calendar invite. What email should I use?",
    endState: true,
    endType: 'success',
    options: [],
  },
  got_referral: {
    id: 'got_referral',
    label: 'Got referral',
    scriptText: "Perfect, I'll reach out to them. Thanks for pointing me in the right direction.",
    endState: true,
    endType: 'success',
    options: [],
  },
  follow_up_later: {
    id: 'follow_up_later',
    label: 'Follow up later',
    scriptText: "Great, I'll send that over. Thanks for your time!",
    endState: true,
    endType: 'neutral',
    options: [],
  },
  call_over: {
    id: 'call_over',
    label: 'Call over',
    scriptText: "Understood. Appreciate your time. Have a good one.",
    endState: true,
    endType: 'end',
    options: [],
  },
};

export default initialTree;
