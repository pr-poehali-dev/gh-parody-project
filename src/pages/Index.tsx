import { useState, useRef } from 'react';
import Icon from '@/components/ui/icon';

const PRESIGN_URL = 'https://functions.poehali.dev/25808474-77a6-4779-9382-1c81b74dedae';

type UploadedFile = {
  url: string;
  filename: string;
  size: number;
  content_type: string;
};

const fileEmoji = (type: string, name: string) => {
  if (type.startsWith('image/')) return '🖼️';
  if (type.startsWith('video/')) return '🎬';
  if (type.startsWith('audio/')) return '🎵';
  if (type.includes('pdf')) return '📕';
  if (type.includes('zip') || type.includes('rar') || name.match(/\.(zip|rar|7z|tar|gz)$/i)) return '🗜️';
  if (name.match(/\.(js|ts|tsx|jsx|py|go|rs|java|c|cpp|css|html|json)$/i)) return '📜';
  return '📄';
};

const sizeStr = (b: number) => (b < 1024 ? `${b} Б` : b < 1048576 ? `${(b / 1024).toFixed(1)} КБ` : `${(b / 1048576).toFixed(1)} МБ`);

type Repo = {
  id: number;
  owner: string;
  name: string;
  desc: string;
  lang: string;
  langColor: string;
  stars: number;
  forks: number;
  updated: string;
};

type Profile = {
  id: number;
  handle: string;
  name: string;
  bio: string;
  followers: number;
  repos: number;
  emoji: string;
};

const REPOS: Repo[] = [
  { id: 1, owner: 'octodrama', name: 'infinite-loop-generator', desc: 'Генерирует бесконечные циклы, из которых невозможно выйти. Работает идеально.', lang: 'JavaScript', langColor: '#f1e05a', stars: 42069, forks: 1337, updated: '3 минуты назад' },
  { id: 2, owner: 'kate-codes', name: 'todo-app-2000', desc: 'Ещё одно приложение для задач. Мир этого ждал.', lang: 'TypeScript', langColor: '#3178c6', stars: 8921, forks: 402, updated: '1 час назад' },
  { id: 3, owner: 'legacy-lord', name: 'jquery-in-2026', desc: 'Кто сказал, что jQuery мёртв? Точно не я.', lang: 'HTML', langColor: '#e34c26', stars: 666, forks: 13, updated: 'вчера' },
  { id: 4, owner: 'py-thonista', name: 'ai-that-says-no', desc: 'Нейросеть, которая на всё отвечает "нет". Революция.', lang: 'Python', langColor: '#3572A5', stars: 15200, forks: 890, updated: '5 дней назад' },
  { id: 5, owner: 'rustacean', name: 'blazingly-fast-nothing', desc: 'Ничего не делает, но делает это очень быстро.', lang: 'Rust', langColor: '#dea584', stars: 99999, forks: 4200, updated: 'на прошлой неделе' },
  { id: 6, owner: 'css-wizard', name: 'center-a-div', desc: 'Спустя 20 лет мы наконец-то это сделали.', lang: 'CSS', langColor: '#563d7c', stars: 31400, forks: 2718, updated: '2 недели назад' },
];

const PROFILES: Profile[] = [
  { id: 101, handle: 'octodrama', name: 'Окто Драма', bio: 'Пишу баги быстрее, чем читаю документацию', followers: 12400, repos: 87, emoji: '🐙' },
  { id: 102, handle: 'kate-codes', name: 'Катя Кодит', bio: 'Ctrl+C, Ctrl+V — вот и вся магия', followers: 8300, repos: 42, emoji: '👩‍💻' },
  { id: 103, handle: 'legacy-lord', name: 'Лорд Легаси', bio: 'Не трогай мой код, он держится на честном слове', followers: 3100, repos: 156, emoji: '🧙' },
];

const NAV = [
  { id: 'home', label: 'Главная', icon: 'House' },
  { id: 'search', label: 'Поиск', icon: 'Search' },
  { id: 'repos', label: 'Репозитории', icon: 'FolderGit2' },
  { id: 'upload', label: 'Загрузить', icon: 'Upload' },
  { id: 'profile', label: 'Профиль', icon: 'User' },
] as const;

type Tab = typeof NAV[number]['id'];

const fmt = (n: number) => n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'k' : String(n);

const loadSaved = (): UploadedFile[] => {
  try { return JSON.parse(localStorage.getItem('gitbrat_files') || '[]'); } catch { return []; }
};

const Index = () => {
  const [tab, setTab] = useState<Tab>('home');
  const [query, setQuery] = useState('');
  const [likes, setLikes] = useState<Record<number, boolean>>({});
  const [uploaded, setUploaded] = useState<UploadedFile[]>(loadSaved);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const addFile = (f: UploadedFile) => {
    setUploaded((prev) => {
      const next = [f, ...prev];
      localStorage.setItem('gitbrat_files', JSON.stringify(next));
      return next;
    });
  };

  const removeFile = (url: string) => {
    setUploaded((prev) => {
      const next = prev.filter((f) => f.url !== url);
      localStorage.setItem('gitbrat_files', JSON.stringify(next));
      return next;
    });
  };

  const toggleLike = (id: number) => setLikes((p) => ({ ...p, [id]: !p[id] }));
  const likeCount = (base: number, id: number) => base + (likes[id] ? 1 : 0);

  const uploadFiles = async (files: FileList | File[]) => {
    setUploadError('');
    setUploading(true);
    setUploadProgress(0);
    const list = Array.from(files);
    try {
      for (let idx = 0; idx < list.length; idx++) {
        const file = list[idx];
        const content_type = file.type || 'application/octet-stream';

        // 1. Получаем presigned URL от сервера
        const presignRes = await fetch(PRESIGN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, content_type }),
        });
        const presignData = await presignRes.json();
        if (!presignRes.ok) throw new Error(presignData.error || 'Не удалось подготовить загрузку');

        // 2. Загружаем файл напрямую в S3 через XMLHttpRequest (для прогресса)
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', presignData.upload_url);
          xhr.setRequestHeader('Content-Type', content_type);
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const fileProgress = e.loaded / e.total;
              const overall = ((idx + fileProgress) / list.length) * 100;
              setUploadProgress(Math.round(overall));
            }
          };
          xhr.onload = () => xhr.status < 300 ? resolve() : reject(new Error(`Ошибка загрузки: ${xhr.status}`));
          xhr.onerror = () => reject(new Error('Сетевая ошибка при загрузке файла'));
          xhr.send(file);
        });

        setUploadProgress(Math.round(((idx + 1) / list.length) * 100));
        addFile({
          url: presignData.cdn_url,
          filename: file.name,
          size: file.size,
          content_type,
        });
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Не удалось загрузить файл');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const filtered = REPOS.filter(
    (r) =>
      (r.name + r.owner + r.desc + r.lang).toLowerCase().includes(query.toLowerCase())
  );

  const StarButton = ({ id, base }: { id: number; base: number }) => (
    <button
      onClick={() => toggleLike(id)}
      className={`group flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-all ${
        likes[id]
          ? 'border-yellow-500/60 bg-yellow-500/10 text-yellow-400'
          : 'border-border bg-secondary text-foreground hover:border-yellow-500/40 hover:text-yellow-400'
      }`}
    >
      <Icon
        name="Star"
        size={15}
        className={`transition-transform group-active:scale-90 ${likes[id] ? 'fill-yellow-400' : ''}`}
      />
      <span>{likes[id] ? 'В избранном' : 'Star'}</span>
      <span className="ml-1 rounded bg-background/60 px-1.5 text-xs">{fmt(likeCount(base, id))}</span>
    </button>
  );

  const RepoCard = ({ r, i }: { r: Repo; i: number }) => (
    <div
      className="animate-fade-in group rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-[0_0_30px_-10px_hsl(137_55%_45%/0.5)]"
      style={{ animationDelay: `${i * 60}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-mono-code text-base">
            <span className="text-muted-foreground">{r.owner}</span>
            <span className="text-muted-foreground">/</span>
            <span className="font-bold text-accent">{r.name}</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{r.desc}</p>
        </div>
        <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">Public</span>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full" style={{ background: r.langColor }} />
          {r.lang}
        </span>
        <span className="flex items-center gap-1">
          <Icon name="GitFork" size={14} /> {fmt(r.forks)}
        </span>
        <span className="flex items-center gap-1 text-xs">
          <Icon name="History" size={13} /> {r.updated}
        </span>
        <div className="ml-auto">
          <StarButton id={r.id} base={r.stars} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center gap-4 px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-xl">🐈‍⬛</div>
            <span className="font-mono-code text-lg font-extrabold tracking-tight">
              Git<span className="text-primary">Brat</span>
            </span>
          </div>
          <div className="ml-auto hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => setTab(n.id)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  tab === n.id ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon name={n.icon} size={15} />
                {n.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3 md:ml-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-lg">🐙</div>
          </div>
        </div>
        {/* mobile nav */}
        <div className="flex items-center gap-1 overflow-x-auto border-t border-border px-2 py-1.5 md:hidden">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ${
                tab === n.id ? 'bg-secondary text-foreground' : 'text-muted-foreground'
              }`}
            >
              <Icon name={n.icon} size={15} />
              {n.label}
            </button>
          ))}
        </div>
      </header>

      {/* HOME */}
      {tab === 'home' && (
        <>
          <section className="grid-bg relative overflow-hidden border-b border-border">
            <div className="container relative px-4 py-20 text-center">
              <span className="animate-fade-in mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                42 миллиона разработчиков делают вид, что заняты
              </span>
              <h1 className="animate-fade-in mx-auto max-w-3xl text-4xl font-black leading-tight md:text-6xl" style={{ animationDelay: '80ms' }}>
                Где код встречает <span className="text-primary">драму</span>
              </h1>
              <p className="animate-fade-in mx-auto mt-5 max-w-xl text-lg text-muted-foreground" style={{ animationDelay: '160ms' }}>
                Хостинг для репозиториев, которые вы забросите через неделю. Лайкайте чужой код и притворяйтесь, что напишете свой.
              </p>
              <div className="animate-fade-in mt-8 flex flex-wrap justify-center gap-3" style={{ animationDelay: '240ms' }}>
                <button className="hover-scale rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground">
                  Начать бесплатно
                </button>
                <button onClick={() => setTab('search')} className="hover-scale rounded-lg border border-border bg-card px-6 py-3 font-semibold">
                  Смотреть репозитории
                </button>
              </div>
              <div className="animate-fade-in mx-auto mt-14 grid max-w-2xl grid-cols-3 gap-4" style={{ animationDelay: '320ms' }}>
                {[
                  ['200M+', 'заброшенных репо'],
                  ['0', 'прочитанных README'],
                  ['∞', 'нерешённых issue'],
                ].map(([n, l]) => (
                  <div key={l} className="rounded-xl border border-border bg-card/50 p-4">
                    <div className="font-mono-code text-2xl font-extrabold text-primary md:text-3xl">{n}</div>
                    <div className="mt-1 text-xs text-muted-foreground md:text-sm">{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
          <section className="container px-4 py-14">
            <div className="mb-6 flex items-center gap-2">
              <Icon name="Flame" size={20} className="text-primary" />
              <h2 className="text-2xl font-bold">В тренде сегодня</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {REPOS.slice(0, 4).map((r, i) => (
                <RepoCard key={r.id} r={r} i={i} />
              ))}
            </div>
          </section>

          {uploaded.length > 0 && (
            <section className="container px-4 pb-14">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon name="CloudUpload" size={20} className="text-accent" />
                  <h2 className="text-2xl font-bold">Мои загрузки</h2>
                  <span className="rounded-full border border-border bg-card px-2 py-0.5 text-xs text-muted-foreground">{uploaded.length}</span>
                </div>
                <button onClick={() => setTab('upload')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Загрузить ещё →
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {uploaded.map((f, i) => (
                  <div
                    key={f.url}
                    className="animate-fade-in group relative flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-accent/50"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-xl">
                        {fileEmoji(f.content_type, f.filename)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-mono-code text-sm font-semibold text-accent">{f.filename}</div>
                        <div className="text-xs text-muted-foreground">{sizeStr(f.size)}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-secondary py-1.5 text-xs font-medium transition-colors hover:border-accent/50 hover:text-accent"
                      >
                        <Icon name="ExternalLink" size={13} /> Открыть
                      </a>
                      <button
                        onClick={() => navigator.clipboard?.writeText(f.url)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-secondary py-1.5 text-xs font-medium transition-colors hover:border-accent/50 hover:text-accent"
                      >
                        <Icon name="Copy" size={13} /> Ссылка
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* SEARCH */}
      {tab === 'search' && (
        <section className="container px-4 py-10">
          <h2 className="mb-5 text-2xl font-bold">Поиск репозиториев</h2>
          <div className="relative mb-8">
            <Icon name="Search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Найти репозиторий, язык, автора..."
              className="w-full rounded-xl border border-border bg-card py-3.5 pl-11 pr-4 font-mono-code text-sm outline-none transition-colors focus:border-primary"
            />
          </div>
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
              <div className="text-4xl">🔍</div>
              <p className="mt-3">Ничего не найдено. Как ваш будущий проект.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filtered.map((r, i) => (
                <RepoCard key={r.id} r={r} i={i} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* REPOS */}
      {tab === 'repos' && (
        <section className="container px-4 py-10">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Все репозитории</h2>
            <span className="rounded-full border border-border bg-card px-3 py-1 text-sm text-muted-foreground">
              {REPOS.length} шт.
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {REPOS.map((r, i) => (
              <RepoCard key={r.id} r={r} i={i} />
            ))}
          </div>
        </section>
      )}

      {/* UPLOAD */}
      {tab === 'upload' && (
        <section className="container px-4 py-10">
          <div className="mb-6 flex items-center gap-2">
            <Icon name="Upload" size={22} className="text-primary" />
            <h2 className="text-2xl font-bold">Загрузка файлов</h2>
          </div>
          <p className="mb-6 text-sm text-muted-foreground">
            Заливайте свои файлы в облако. Максимум 15 МБ на файл. README читать необязательно.
          </p>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInput.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed py-16 text-center transition-all ${
              dragOver ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/50'
            }`}
          >
            <input
              ref={fileInput}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => { if (e.target.files?.length) uploadFiles(e.target.files); e.target.value = ''; }}
            />
            <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-3xl ${uploading ? 'animate-pulse' : ''}`}>
              {uploading ? '🚀' : '📤'}
            </div>
            <p className="mt-4 font-semibold">
              {uploading ? `Загружаю в космос... ${uploadProgress}%` : 'Перетащите файлы сюда или нажмите'}
            </p>
            {uploading ? (
              <div className="mt-3 w-64 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-2 rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">Любой формат, любой размер</p>
            )}
          </div>

          {uploadError && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <Icon name="TriangleAlert" size={16} /> {uploadError}
            </div>
          )}

          {uploaded.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
                <Icon name="FolderCheck" size={18} className="text-primary" /> Загруженные файлы
                <span className="rounded-full border border-border bg-card px-2 py-0.5 text-xs font-normal text-muted-foreground">
                  {uploaded.length}
                </span>
              </h3>
              <div className="grid gap-3">
                {uploaded.map((f, i) => (
                  <div
                    key={f.url}
                    className="animate-fade-in flex items-center gap-4 rounded-xl border border-border bg-card p-4"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-2xl">
                      {fileEmoji(f.content_type, f.filename)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-mono-code text-sm font-semibold text-accent">{f.filename}</div>
                      <div className="text-xs text-muted-foreground">{sizeStr(f.size)}</div>
                    </div>
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-sm font-medium transition-colors hover:border-primary/50 hover:text-primary"
                    >
                      <Icon name="ExternalLink" size={14} /> Открыть
                    </a>
                    <button
                      onClick={() => navigator.clipboard?.writeText(f.url)}
                      className="flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-sm font-medium transition-colors hover:border-primary/50 hover:text-primary"
                    >
                      <Icon name="Copy" size={14} /> Ссылка
                    </button>
                    <button
                      onClick={() => removeFile(f.url)}
                      className="flex shrink-0 items-center justify-center rounded-md border border-border bg-secondary p-2 text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
                    >
                      <Icon name="Trash2" size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* PROFILE */}
      {tab === 'profile' && (
        <section className="container px-4 py-10">
          <div className="grid gap-8 md:grid-cols-[300px_1fr]">
            <aside className="animate-fade-in">
              <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full border-4 border-primary/30 bg-card text-7xl">
                🐙
              </div>
              <h2 className="mt-5 text-2xl font-bold">Окто Драма</h2>
              <p className="font-mono-code text-muted-foreground">octodrama</p>
              <p className="mt-3 text-sm text-muted-foreground">
                Пишу баги быстрее, чем читаю документацию. Живу на кофе и Stack Overflow.
              </p>
              <button
                onClick={() => toggleLike(999)}
                className={`mt-5 flex w-full items-center justify-center gap-2 rounded-lg border py-2.5 font-semibold transition-all ${
                  likes[999]
                    ? 'border-red-500/60 bg-red-500/10 text-red-400'
                    : 'border-border bg-card hover:border-red-500/40 hover:text-red-400'
                }`}
              >
                <Icon name="Heart" size={17} className={likes[999] ? 'fill-red-400' : ''} />
                {likes[999] ? 'Вам нравится' : 'Поставить лайк'}
                <span className="rounded bg-background/60 px-1.5 text-xs">{fmt(likeCount(9800, 999))}</span>
              </button>
              <div className="mt-5 flex justify-around rounded-xl border border-border bg-card py-3 text-center text-sm">
                <div>
                  <div className="font-mono-code font-bold text-foreground">87</div>
                  <div className="text-muted-foreground">репо</div>
                </div>
                <div>
                  <div className="font-mono-code font-bold text-foreground">12.4k</div>
                  <div className="text-muted-foreground">подписчиков</div>
                </div>
                <div>
                  <div className="font-mono-code font-bold text-foreground">3</div>
                  <div className="text-muted-foreground">подписки</div>
                </div>
              </div>
            </aside>

            <div>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
                <Icon name="Pin" size={18} className="text-primary" /> Закреплённые
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {REPOS.slice(0, 4).map((r, i) => (
                  <RepoCard key={r.id} r={r} i={i} />
                ))}
              </div>

              <h3 className="mb-4 mt-10 flex items-center gap-2 text-lg font-bold">
                <Icon name="Users" size={18} className="text-primary" /> Другие профили
              </h3>
              <div className="grid gap-3">
                {PROFILES.map((p, i) => (
                  <div
                    key={p.id}
                    className="animate-fade-in flex items-center gap-4 rounded-xl border border-border bg-card p-4"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-secondary text-2xl">
                      {p.emoji}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold">{p.name}</div>
                      <div className="font-mono-code text-sm text-muted-foreground">{p.bio}</div>
                    </div>
                    <button
                      onClick={() => toggleLike(p.id)}
                      className={`ml-auto flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-all ${
                        likes[p.id]
                          ? 'border-red-500/60 bg-red-500/10 text-red-400'
                          : 'border-border bg-secondary hover:border-red-500/40 hover:text-red-400'
                      }`}
                    >
                      <Icon name="Heart" size={14} className={likes[p.id] ? 'fill-red-400' : ''} />
                      {fmt(likeCount(p.followers, p.id))}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <footer className="mt-10 border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p className="font-mono-code">
          © 2026 GitBrat — <span className="text-primary">git commit -m "финальный фикс (обещаю)"</span>
        </p>
      </footer>
    </div>
  );
};

export default Index;