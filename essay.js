// The essay, as one object. Every section lives here; each html page just names the section it shows.
//
//   page     the html file for this section
//   dark     false = black on white, true = white on black
//   type     'passage'    text that arrives word by word (on the first page it is pulled out of the egg)
//            'statements' a set of statements; the reader clicks the one they align with
//   next     passage only: the section a link word leads to when the link names no section.
//            A passage with no [[link word]] makes its last word the link to `next`.
//   text     passage only. Wrap the one link word in double brackets: [[word|sectionId]]
//            (the part after | is optional and defaults to `next`; a filename also works)
//   choices  statements only: the statements, each with the section it leads to
//   nodes    nexus only: the words that drift in the swirling mass; each leads to a section ({ text, to, tunnel })
//            (the nexus' own `text` is the passage beside the mass; it has no link word)
//

const TUNNEL_COLOR = '#0645d6';

const ESSAY = {
  sections: {

    intro: {
      page: 'index.html', dark: false, type: 'passage', next: 'statements',
      tunnel: '#0645d6',
      text: 'To begin, I am not attempting to speak in metaphor. From here on out, take everything I say literally, even when I myself seem to imply otherwise. This is, for all intents and purposes, an exercise on world building—one that we will soon see is topographically vicious, sticky, plastic, cardinal. We will be dealing with text, The Text, as a material (and technological) entity on par with and even superior to, that of the wheel or the motor. The Text is an egg as an egg is a [[door|statements]], no inside or outside but an inside-outside-outside-inside.'
    },

    statements: {
      page: 'section2.html', dark: true, type: 'statements',
    tunnel: '#000',
      choices: [
        { text: 'I want to become unknown even to myself.',  to: 'a' },
        { text: 'I love to march, engaged in that collective spirit.',            to: 'b' },
        { text: 'Talking is too intimate, we should be silent.',                         to: 'c' },
        { text: 'A mole digs a hole, deepdeeper, until he finds stars.',               to: 'd' }
      ]
    },

    a: {
      page: 'section3.html', dark: true, type: 'passage', next: 'next',
      tunnel: '#fff',
      text:  'The Egg. The World. The Self. A totality contained within itself, immanent. The egg has a clear story. An external-internal womb of potential and possibility, from which one might emerge into eventual flight. From that emerged entity we might expect another egg, or at least the impregnation into another egg creator.'
    },
     b: {
      page: 'section3.html', dark: true, type: 'passage', next: 'next',
      tunnel: '#fff',
      text: 'The question of what the topology of the superstructure itself entails a relinquishment of firm boundaries but also of any totalities. That is not to say the illusion of totalities does not exist. The recording surface can take the form of any defining substrate. Capitalism, fascism, themselves are totalities in that they insist upon themselves and reiterate their own narrative prominence as to become immanently degenerative.'
    },
     c: {
      page: 'section3.html', dark: true, type: 'passage', next: 'next',
      tunnel: '#fff',
      text: 'But the egg is immanent. We never leave the egg. There is, effectively, no shell. The embryonic fluid is itself the shell, the barrier that never ends, the horizon that always recedes, the space-time starfield that always emanates away from us. The egg is the amniotic sac is the particle horizon.'
    },
     d: {
      page: 'section3.html', dark: true, type: 'passage', next: 'next',
      tunnel: '#fff',
      text: 'But how truly does the life inside an egg truly matter to us? What story does the particle horizon tell? Let’s focus on the amniotic fluid from which we emerged and let us analogize.'
    },

    nexus: {
      page: 'nexus.html', dark: true, type: 'nexus',
      tunnel: '#000',
      exit: { text: 'again', to: 'intro', tunnel: '#000' },
      text: 'There are many mechanisms of the Supernarrative—spatiality, linguistics, faciality, temporal processing, encoding, subjectivity, and framing. Entities such as culture or milieu are both part and parcel of the supernarrative structure.',
      nodes: [
        { text: 'spatiality',       to: 'spatiality',    tunnel: '#3A86FF' },
        { text: 'linguistics',      to: 'linguistics',   tunnel: '#8338EC' },
        { text: 'faciality',         to: 'faciality',      tunnel: '#FF006E' },
        { text: 'temporal processing', to: 'temporal',   tunnel: '#FB5607' },
        { text: 'encoding',         to: 'encoding',      tunnel: '#FFBE0B' },
        { text: 'subjectivity',     to: 'subjectivity',  tunnel: '#fff' },
        { text: 'framing',          to: 'framing',       tunnel: '#C77DFF' }
      ]
    },

    spatiality:   { page: 'section3.html', dark: true, type: 'passage', next: 'nexus', tunnel: '#000', 
      text: 'How we organize ourselves, our language, our story. This is how we [[interface|nexus]] with the world. Connects to temporal processing in that together, as space-time, it is the main phenomenom our brains must negotiate. We might think of The Text as organized on spatial axis rather than purely linguistic or phonetic.' },
    linguistics:  { page: 'section3.html', dark: true, type: 'passage', next: 'nexus', tunnel: '#000', 
      text: 'How we currently view language as a technological advancement. Communicative and social in nature. It is a [[project|nexus]] of the Collective, not the individual. No man an island, story in an empty sea.' },
    faciality:     { page: 'section3.html', dark: true, type: 'passage', next: 'nexus', tunnel: '#000', 
      text: 'The black dot aginst the white wall (according to Deleuze and Guattari). Signifier and signified, symbol and sign. A tyranny that dictates our mode of interfacing. What [[lies|nexus]] beyond the face, the black on white symbol? This simplfies the story for us for relay.' },
    temporal:     { page: 'section3.html', dark: true, type: 'passage', next: 'nexus', tunnel: '#000', 
      text: 'Cognitively, how do we handle time? For the most part, linearly. But the narrative as a device allows us to account for loops, returns, folds, dimensionality against the line. The supernarrative comes out of our collective aims to organize time socially, not all at once, but in arcs. The project of [[history|nexus]] is borne.' },
    encoding:     { page: 'section3.html', dark: true, type: 'passage', next: 'nexus', tunnel: '#000', 
      text: 'What means what, how means how. Encryption, double meanings and double binds. We invest energy into certain things so they mean more than they are. The narrative is given weight and [[meaning-making|nexus]] is done.' },
    subjectivity: { page: 'section3.html', dark: true, type: 'passage', next: 'nexus', tunnel: '#000', 
      text: 'Object or subject? How do we recognize the individual, the self, agaisnt the colelctive, the eveyrthing? The supernarrative distinguishes us, seemingly, from bridge or tree, bird or granite. The difference between prop and character, subjective [[experience|nexus]] intersects, inserts, into itself.' },

    framing:      { page: 'section3.html', dark: true, type: 'passage', next: 'nexus', tunnel: '#000', 
      text: "Context is everything. A structure isn't a structure wihtout a framing. We situate our symbols, build an altar and it accumulates through history, time. And thus, the [[supernarrative|nexus]] structure." },

    next: {
        page: 'section4.html', dark: false, type: 'passage', next: 'nexus',
        tunnel: '#0645d6',
        text: 'Let us take the Canon, the Story, the Narratove superstructure, and propose: a communally authored, essentially eerie, agentic and generative geometry simultaneously recording and acting upon humanity with real material consequences, even "outside of the text," i.e. our anthropocentric perception.'
    }
  }
};

// helper shared by every page: the file a section id (or a filename) points to
// (the section id rides along as ?s=, so several sections can share one html page)
ESSAY.pageOf = ref => (ESSAY.sections[ref] ? ESSAY.sections[ref].page + '?s=' + ref : ref);