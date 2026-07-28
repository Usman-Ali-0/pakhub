export type Locale =
  | 'en' | 'ur' | 'ps' | 'ar' | 'hi' | 'fa' | 'tr' | 'bn' | 'pa'
  | 'fr' | 'de' | 'es' | 'pt' | 'ru' | 'zh' | 'ja' | 'ko' | 'id' | 'ms' | 'sw';

export const LOCALES: { code: Locale; name: string; nativeName: string; rtl?: boolean }[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', rtl: true },
  { code: 'ps', name: 'Pashto', nativeName: 'پښتو', rtl: true },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', rtl: true },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
];

export type TranslationKeys = {
  nav: {
    pullRequests: string;
    issues: string;
    explore: string;
    signIn: string;
    signUp: string;
    signOut: string;
    notifications: string;
    settings: string;
    aiProviders: string;
    yourProfile: string;
    yourRepos: string;
    yourStars: string;
    newRepo: string;
    importRepo: string;
    search: string;
    language: string;
    workflows: string;
  };
  common: {
    loading: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    create: string;
    upload: string;
    download: string;
    success: string;
    error: string;
    notFound: string;
    goHome: string;
  };
  repo: {
    code: string;
    issues: string;
    pullRequests: string;
    commits: string;
    releases: string;
    settings: string;
    workflows: string;
    star: string;
    starred: string;
    fork: string;
    watch: string;
    clone: string;
    uploadZip: string;
    uploadProject: string;
    public: string;
    private: string;
    about: string;
    languages: string;
    contributors: string;
    noDescription: string;
  };
  workflow: {
    title: string;
    runs: string;
    newWorkflow: string;
    syncWorkflows: string;
    runWorkflow: string;
    status: string;
    trigger: string;
    branch: string;
    duration: string;
    noWorkflows: string;
    noRuns: string;
    success: string;
    failure: string;
    inProgress: string;
    queued: string;
    pending: string;
    cancelled: string;
  };
  ai: {
    title: string;
    subtitle: string;
    addProvider: string;
    apiKey: string;
    model: string;
    chat: string;
    send: string;
    thinking: string;
    placeholder: string;
  };
  auth: {
    login: string;
    register: string;
    username: string;
    email: string;
    password: string;
    name: string;
  };
  settings: {
    language: string;
    languageDesc: string;
    selectLanguage: string;
  };
  home: {
    tagline: string;
    getStarted: string;
    features: string;
  };
};

const en: TranslationKeys = {
  nav: {
    pullRequests: 'Pull requests',
    issues: 'Issues',
    explore: 'Explore',
    signIn: 'Sign in',
    signUp: 'Sign up',
    signOut: 'Sign out',
    notifications: 'Notifications',
    settings: 'Settings',
    aiProviders: 'AI providers',
    yourProfile: 'Your profile',
    yourRepos: 'Your repositories',
    yourStars: 'Your stars',
    newRepo: 'New repository',
    importRepo: 'Import repository',
    search: 'Search',
    language: 'Language',
    workflows: 'Actions',
  },
  common: {
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    create: 'Create',
    upload: 'Upload',
    download: 'Download',
    success: 'Success',
    error: 'Error',
    notFound: 'Not found',
    goHome: 'Go to home',
  },
  repo: {
    code: 'Code',
    issues: 'Issues',
    pullRequests: 'Pull requests',
    commits: 'Commits',
    releases: 'Releases',
    settings: 'Settings',
    workflows: 'Actions',
    star: 'Star',
    starred: 'Starred',
    fork: 'Fork',
    watch: 'Watch',
    clone: 'Clone',
    uploadZip: 'Upload files (.zip)',
    uploadProject: 'Upload project .zip file',
    public: 'Public',
    private: 'Private',
    about: 'About',
    languages: 'Languages',
    contributors: 'Contributors',
    noDescription: 'No description provided.',
  },
  workflow: {
    title: 'Workflows',
    runs: 'Workflow runs',
    newWorkflow: 'New workflow',
    syncWorkflows: 'Sync from repository',
    runWorkflow: 'Run workflow',
    status: 'Status',
    trigger: 'Trigger',
    branch: 'Branch',
    duration: 'Duration',
    noWorkflows: 'No workflows configured',
    noRuns: 'No workflow runs yet',
    success: 'Success',
    failure: 'Failure',
    inProgress: 'In progress',
    queued: 'Queued',
    pending: 'Pending',
    cancelled: 'Cancelled',
  },
  ai: {
    title: 'AI Providers',
    subtitle: 'Bring Your Own AI — connect any AI model with your API key',
    addProvider: 'Add provider',
    apiKey: 'API Key',
    model: 'Model',
    chat: 'AI Chat',
    send: 'Send',
    thinking: 'Thinking...',
    placeholder: 'Ask PakHub AI anything about your code...',
  },
  auth: {
    login: 'Sign in',
    register: 'Create account',
    username: 'Username',
    email: 'Email',
    password: 'Password',
    name: 'Full name',
  },
  settings: {
    language: 'Language',
    languageDesc: 'Choose your preferred language for the PakHub interface',
    selectLanguage: 'Select language',
  },
  home: {
    tagline: 'Where Pakistan Builds Software',
    getStarted: 'Get started',
    features: 'Features',
  },
};

const ur: TranslationKeys = {
  nav: {
    pullRequests: 'پل ریکویسٹس',
    issues: 'مسائل',
    explore: 'دریافت',
    signIn: 'سائن ان',
    signUp: 'سائن اپ',
    signOut: 'سائن آؤٹ',
    notifications: 'اطلاعات',
    settings: 'ترتیبات',
    aiProviders: 'AI فراہم کنندگان',
    yourProfile: 'آپ کی پروفائل',
    yourRepos: 'آپ کے ریپوزٹریز',
    yourStars: 'آپ کے ستارے',
    newRepo: 'نیا ریپوزٹری',
    importRepo: 'ریپوزٹری درآمد',
    search: 'تلاش',
    language: 'زبان',
    workflows: 'ورک فلو',
  },
  common: {
    loading: 'لوڈ ہو رہا ہے...',
    save: 'محفوظ',
    cancel: 'منسوخ',
    delete: 'حذف',
    edit: 'ترمیم',
    create: 'بنائیں',
    upload: 'اپ لوڈ',
    download: 'ڈاؤن لوڈ',
    success: 'کامیاب',
    error: 'خرابی',
    notFound: 'نہیں ملا',
    goHome: 'ہوم پر جائیں',
  },
  repo: {
    code: 'کوڈ',
    issues: 'مسائل',
    pullRequests: 'پل ریکویسٹس',
    commits: 'کمیٹس',
    releases: 'ریلیز',
    settings: 'ترتیبات',
    workflows: 'ورک فلو',
    star: 'ستارہ',
    starred: 'ستارہ لگا',
    fork: 'فورک',
    watch: 'دیکھیں',
    clone: 'کلون',
    uploadZip: 'فائلیں اپ لوڈ (.zip)',
    uploadProject: 'پروجیکٹ .zip اپ لوڈ',
    public: 'عوامی',
    private: 'نجی',
    about: 'تعارف',
    languages: 'زبانیں',
    contributors: 'تعاون کنندگان',
    noDescription: 'کوئی تفصیل نہیں۔',
  },
  workflow: {
    title: 'ورک فلو',
    runs: 'ورک فلو رنز',
    newWorkflow: 'نیا ورک فلو',
    syncWorkflows: 'ریپوزٹری سے ہم آہنگ',
    runWorkflow: 'ورک فلو چلائیں',
    status: 'حالت',
    trigger: 'ٹرگر',
    branch: 'برانچ',
    duration: 'دورانیہ',
    noWorkflows: 'کوئی ورک فلو نہیں',
    noRuns: 'ابھی کوئی رن نہیں',
    success: 'کامیاب',
    failure: 'ناکام',
    inProgress: 'جاری',
    queued: 'قطار میں',
    pending: 'زیر التوا',
    cancelled: 'منسوخ',
  },
  ai: {
    title: 'AI فراہم کنندگان',
    subtitle: 'اپنا AI لائیں — API key سے کوئی بھی ماڈل جوڑیں',
    addProvider: 'فراہم کنندہ شامل',
    apiKey: 'API Key',
    model: 'ماڈل',
    chat: 'AI چیٹ',
    send: 'بھیجیں',
    thinking: 'سوچ رہا ہے...',
    placeholder: 'PakHub AI سے اپنے کوڈ کے بارے میں پوچھیں...',
  },
  auth: {
    login: 'سائن ان',
    register: 'اکاؤنٹ بنائیں',
    username: 'صارف نام',
    email: 'ای میل',
    password: 'پاس ورڈ',
    name: 'پورا نام',
  },
  settings: {
    language: 'زبان',
    languageDesc: 'PakHub انٹرفیس کی زبان منتخب کریں',
    selectLanguage: 'زبان منتخب کریں',
  },
  home: {
    tagline: 'جہاں پاکستان سافٹ ویئر بناتا ہے',
    getStarted: 'شروع کریں',
    features: 'خصوصیات',
  },
};

const ps: TranslationKeys = {
  nav: {
    pullRequests: 'د غوښتنې کش',
    issues: 'ستونزې',
    explore: 'پلټنه',
    signIn: 'ننوتل',
    signUp: 'نوم لیکنه',
    signOut: 'وتل',
    notifications: 'خبرتیاوې',
    settings: 'تنظیمات',
    aiProviders: 'AI چمتو کوونکي',
    yourProfile: 'ستاسو پروفایل',
    yourRepos: 'ستاسو ریپوزټرۍ',
    yourStars: 'ستاسو ستوري',
    newRepo: 'نوی ریپوزټري',
    importRepo: 'ریپوزټري واردول',
    search: 'لټون',
    language: 'ژبه',
    workflows: 'کار جریان',
  },
  common: {
    loading: 'پورته کیږي...',
    save: 'ساتل',
    cancel: 'لغوه',
    delete: 'ړنګول',
    edit: 'سمول',
    create: 'جوړول',
    upload: 'پورته کول',
    download: 'ډاونلوډ',
    success: 'بریالی',
    error: 'تیروتنه',
    notFound: 'و نه موندل شو',
    goHome: 'کور ته لاړ شئ',
  },
  repo: {
    code: 'کوډ',
    issues: 'ستونزې',
    pullRequests: 'د غوښتنې کش',
    commits: 'کومټونه',
    releases: 'خپرونې',
    settings: 'تنظیمات',
    workflows: 'کار جریان',
    star: 'ستوری',
    starred: 'ستوری شوی',
    fork: 'فورک',
    watch: 'کتل',
    clone: 'کلون',
    uploadZip: 'فایلونه پورته (.zip)',
    uploadProject: 'پروژه .zip پورته',
    public: 'عام',
    private: 'شخصي',
    about: 'په اړه',
    languages: 'ژبې',
    contributors: 'مرسته کوونکي',
    noDescription: 'تشریح نشته.',
  },
  workflow: {
    title: 'کار جریان',
    runs: 'د کار جریان رنونه',
    newWorkflow: 'نوی کار جریان',
    syncWorkflows: 'له ریپوزټري همغږي',
    runWorkflow: 'کار جریان چلول',
    status: 'حالت',
    trigger: 'ټریګر',
    branch: 'برانچ',
    duration: 'موده',
    noWorkflows: 'کار جریان نشته',
    noRuns: 'تر اوسه رن نشته',
    success: 'بریالی',
    failure: 'ناکام',
    inProgress: 'پرمخ',
    queued: 'په قطار کې',
    pending: 'انتظار',
    cancelled: 'لغوه',
  },
  ai: {
    title: 'AI چمتو کوونکي',
    subtitle: 'خپل AI راوړئ — د API key سره هر ماډل وصل کړئ',
    addProvider: 'چمتو کوونکی اضافه',
    apiKey: 'API Key',
    model: 'ماډل',
    chat: 'AI چټ',
    send: 'لیږل',
    thinking: 'فکر کوي...',
    placeholder: 'د PakHub AI څخه د خپل کوډ په اړه پوښتنه وکړئ...',
  },
  auth: {
    login: 'ننوتل',
    register: 'حساب جوړول',
    username: 'کارن نوم',
    email: 'بریښنالیک',
    password: 'پټنوم',
    name: 'بشپړ نوم',
  },
  settings: {
    language: 'ژبه',
    languageDesc: 'د PakHub انٹرفیس ژبه وټاکئ',
    selectLanguage: 'ژبه وټاکئ',
  },
  home: {
    tagline: 'چیرته چې پاکستان سافټویر جوړوي',
    getStarted: 'پیل وکړئ',
    features: 'ځانګړتیاوې',
  },
};

const ar: TranslationKeys = {
  ...en,
  nav: { ...en.nav, pullRequests: 'طلبات السحب', issues: 'المشكلات', explore: 'استكشاف', signIn: 'تسجيل الدخول', signUp: 'إنشاء حساب', signOut: 'تسجيل الخروج', notifications: 'الإشعارات', settings: 'الإعدادات', language: 'اللغة', workflows: 'سير العمل' },
  repo: { ...en.repo, code: 'الكود', workflows: 'سير العمل', star: 'نجمة', fork: 'نسخ', clone: 'استنساخ' },
  settings: { language: 'اللغة', languageDesc: 'اختر لغة واجهة PakHub', selectLanguage: 'اختر اللغة' },
  home: { tagline: 'حيث يبني باكستان البرمجيات', getStarted: 'ابدأ', features: 'الميزات' },
};

const hi: TranslationKeys = {
  ...en,
  nav: { ...en.nav, pullRequests: 'पुल अनुरोध', issues: 'समस्याएं', explore: 'खोजें', signIn: 'साइन इन', signUp: 'साइन अप', language: 'भाषा', workflows: 'वर्कफ़्लो' },
  repo: { ...en.repo, code: 'कोड', workflows: 'वर्कफ़्लो', star: 'स्टार', fork: 'फोर्क' },
  settings: { language: 'भाषा', languageDesc: 'PakHub इंटरफ़ेस की भाषा चुनें', selectLanguage: 'भाषा चुनें' },
  home: { tagline: 'जहाँ पाकिस्तान सॉफ़्टवेयर बनाता है', getStarted: 'शुरू करें', features: 'विशेषताएं' },
};

const fa: TranslationKeys = {
  ...en,
  nav: { ...en.nav, pullRequests: 'درخواست‌های کش', issues: 'مسائل', explore: 'کاوش', signIn: 'ورود', signUp: 'ثبت‌نام', language: 'زبان', workflows: 'گردش کار' },
  settings: { language: 'زبان', languageDesc: 'زبان رابط PakHub را انتخاب کنید', selectLanguage: 'انتخاب زبان' },
  home: { tagline: 'جایی که پاکستان نرم‌افزار می‌سازد', getStarted: 'شروع کنید', features: 'ویژگی‌ها' },
};

const tr: TranslationKeys = {
  ...en,
  nav: { ...en.nav, pullRequests: 'Çekme istekleri', issues: 'Sorunlar', explore: 'Keşfet', signIn: 'Giriş', signUp: 'Kayıt ol', language: 'Dil', workflows: 'İş akışları' },
  settings: { language: 'Dil', languageDesc: 'PakHub arayüz dili seçin', selectLanguage: 'Dil seçin' },
  home: { tagline: 'Pakistan\'ın Yazılım İnşa Ettiği Yer', getStarted: 'Başlayın', features: 'Özellikler' },
};

const fr: TranslationKeys = {
  ...en,
  nav: { ...en.nav, pullRequests: 'Pull requests', issues: 'Problèmes', explore: 'Explorer', signIn: 'Connexion', signUp: 'Inscription', language: 'Langue', workflows: 'Workflows' },
  settings: { language: 'Langue', languageDesc: 'Choisissez la langue de l\'interface PakHub', selectLanguage: 'Sélectionner la langue' },
  home: { tagline: 'Où le Pakistan construit des logiciels', getStarted: 'Commencer', features: 'Fonctionnalités' },
};

const de: TranslationKeys = {
  ...en,
  nav: { ...en.nav, pullRequests: 'Pull-Anfragen', issues: 'Probleme', explore: 'Entdecken', signIn: 'Anmelden', signUp: 'Registrieren', language: 'Sprache', workflows: 'Workflows' },
  settings: { language: 'Sprache', languageDesc: 'Wählen Sie die PakHub-Oberflächensprache', selectLanguage: 'Sprache wählen' },
  home: { tagline: 'Wo Pakistan Software baut', getStarted: 'Loslegen', features: 'Funktionen' },
};

const es: TranslationKeys = {
  ...en,
  nav: { ...en.nav, pullRequests: 'Solicitudes de extracción', issues: 'Problemas', explore: 'Explorar', signIn: 'Iniciar sesión', signUp: 'Registrarse', language: 'Idioma', workflows: 'Flujos de trabajo' },
  settings: { language: 'Idioma', languageDesc: 'Elija el idioma de la interfaz PakHub', selectLanguage: 'Seleccionar idioma' },
  home: { tagline: 'Donde Pakistán construye software', getStarted: 'Comenzar', features: 'Características' },
};

const pt: TranslationKeys = {
  ...en,
  nav: { ...en.nav, pullRequests: 'Pull requests', issues: 'Problemas', explore: 'Explorar', signIn: 'Entrar', signUp: 'Cadastrar', language: 'Idioma', workflows: 'Workflows' },
  settings: { language: 'Idioma', languageDesc: 'Escolha o idioma da interface PakHub', selectLanguage: 'Selecionar idioma' },
  home: { tagline: 'Onde o Paquistão constrói software', getStarted: 'Começar', features: 'Recursos' },
};

const ru: TranslationKeys = {
  ...en,
  nav: { ...en.nav, pullRequests: 'Запросы на слияние', issues: 'Проблемы', explore: 'Обзор', signIn: 'Войти', signUp: 'Регистрация', language: 'Язык', workflows: 'Рабочие процессы' },
  settings: { language: 'Язык', languageDesc: 'Выберите язык интерфейса PakHub', selectLanguage: 'Выбрать язык' },
  home: { tagline: 'Где Пакистан создаёт программное обеспечение', getStarted: 'Начать', features: 'Возможности' },
};

const zh: TranslationKeys = {
  ...en,
  nav: { ...en.nav, pullRequests: '拉取请求', issues: '问题', explore: '探索', signIn: '登录', signUp: '注册', language: '语言', workflows: '工作流' },
  settings: { language: '语言', languageDesc: '选择 PakHub 界面语言', selectLanguage: '选择语言' },
  home: { tagline: '巴基斯坦构建软件的地方', getStarted: '开始使用', features: '功能' },
};

const ja: TranslationKeys = {
  ...en,
  nav: { ...en.nav, pullRequests: 'プルリクエスト', issues: 'イシュー', explore: '探索', signIn: 'サインイン', signUp: 'サインアップ', language: '言語', workflows: 'ワークフロー' },
  settings: { language: '言語', languageDesc: 'PakHub インターフェースの言語を選択', selectLanguage: '言語を選択' },
  home: { tagline: 'パキスタンがソフトウェアを構築する場所', getStarted: '始める', features: '機能' },
};

const ko: TranslationKeys = {
  ...en,
  nav: { ...en.nav, pullRequests: '풀 리퀘스트', issues: '이슈', explore: '탐색', signIn: '로그인', signUp: '가입', language: '언어', workflows: '워크플로' },
  settings: { language: '언어', languageDesc: 'PakHub 인터페이스 언어 선택', selectLanguage: '언어 선택' },
  home: { tagline: '파키스탄이 소프트웨어를 만드는 곳', getStarted: '시작하기', features: '기능' },
};

const bn: TranslationKeys = {
  ...en,
  nav: { ...en.nav, pullRequests: 'পুল রিকোয়েস্ট', issues: 'সমস্যা', explore: 'অনুসন্ধান', signIn: 'সাইন ইন', signUp: 'সাইন আপ', language: 'ভাষা', workflows: 'ওয়ার্কফ্লো' },
  settings: { language: 'ভাষা', languageDesc: 'PakHub ইন্টারফেসের ভাষা নির্বাচন করুন', selectLanguage: 'ভাষা নির্বাচন' },
  home: { tagline: 'যেখানে পাকিস্তান সফটওয়্যার তৈরি করে', getStarted: 'শুরু করুন', features: 'বৈশিষ্ট্য' },
};

const pa: TranslationKeys = {
  ...en,
  nav: { ...en.nav, pullRequests: 'ਪੁਲ ਬੇਨਤੀਆਂ', issues: 'ਮੁੱਦੇ', explore: 'ਖੋਜ', signIn: 'ਸਾਈਨ ਇਨ', signUp: 'ਸਾਈਨ ਅੱਪ', language: 'ਭਾਸ਼ਾ', workflows: 'ਵਰਕਫਲੋ' },
  settings: { language: 'ਭਾਸ਼ਾ', languageDesc: 'PakHub ਇੰਟਰਫੇਸ ਭਾਸ਼ਾ ਚੁਣੋ', selectLanguage: 'ਭਾਸ਼ਾ ਚੁਣੋ' },
  home: { tagline: 'ਜਿੱਥੇ ਪਾਕਿਸਤਾਨ ਸਾਫਟਵੇਅਰ ਬਣਾਉਂਦਾ ਹੈ', getStarted: 'ਸ਼ੁਰੂ ਕਰੋ', features: 'ਵਿਸ਼ੇਸ਼ਤਾਵਾਂ' },
};

const id: TranslationKeys = {
  ...en,
  nav: { ...en.nav, pullRequests: 'Permintaan tarik', issues: 'Masalah', explore: 'Jelajahi', signIn: 'Masuk', signUp: 'Daftar', language: 'Bahasa', workflows: 'Alur kerja' },
  settings: { language: 'Bahasa', languageDesc: 'Pilih bahasa antarmuka PakHub', selectLanguage: 'Pilih bahasa' },
  home: { tagline: 'Tempat Pakistan Membangun Perangkat Lunak', getStarted: 'Mulai', features: 'Fitur' },
};

const ms: TranslationKeys = {
  ...en,
  nav: { ...en.nav, pullRequests: 'Permintaan tarik', issues: 'Isu', explore: 'Teroka', signIn: 'Log masuk', signUp: 'Daftar', language: 'Bahasa', workflows: 'Aliran kerja' },
  settings: { language: 'Bahasa', languageDesc: 'Pilih bahasa antara muka PakHub', selectLanguage: 'Pilih bahasa' },
  home: { tagline: 'Di Mana Pakistan Membina Perisian', getStarted: 'Mula', features: 'Ciri-ciri' },
};

const sw: TranslationKeys = {
  ...en,
  nav: { ...en.nav, pullRequests: 'Maombi ya kuvuta', issues: 'Masuala', explore: 'Gundua', signIn: 'Ingia', signUp: 'Jisajili', language: 'Lugha', workflows: 'Mtiririko wa kazi' },
  settings: { language: 'Lugha', languageDesc: 'Chagua lugha ya kiolesura cha PakHub', selectLanguage: 'Chagua lugha' },
  home: { tagline: 'Mahali Pakistan Inajenga Programu', getStarted: 'Anza', features: 'Vipengele' },
};

export const translations: Record<Locale, TranslationKeys> = {
  en, ur, ps, ar, hi, fa, tr, bn, pa, fr, de, es, pt, ru, zh, ja, ko, id, ms, sw,
};

export function getTranslation(locale: Locale): TranslationKeys {
  return translations[locale] || translations.en;
}

export function isRtl(locale: Locale): boolean {
  return LOCALES.find(l => l.code === locale)?.rtl ?? false;
}

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_STORAGE_KEY = 'pakhub-locale';
