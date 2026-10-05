'use client';

import { useState } from 'react';
import {
  Accessibility,
  ArrowRight,
  Bell,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  Compass,
  Heart,
  Home,
  LocateFixed,
  LogIn,
  Map,
  MapPin,
  Menu,
  Search,
  Settings,
  Sparkles,
  UserRound,
  UsersRound,
} from 'lucide-react';

const events = [
  {
    title: 'Festival Cidade Aberta',
    place: 'Parque Villa-Lobos, São Paulo',
    date: '18–20 out',
    color: 'coral',
    icon: '◒',
  },
  {
    title: 'Expo Inovação 2026',
    place: 'São Paulo Expo',
    date: '04–07 nov',
    color: 'blue',
    icon: '✦',
  },
  {
    title: 'Congresso Conecta',
    place: 'Centro de Convenções Rebouças',
    date: '22 nov',
    color: 'lavender',
    icon: '◉',
  },
];

const categories = [
  { label: 'Cultura', icon: '✦' },
  { label: 'Tecnologia', icon: '⌁' },
  { label: 'Música', icon: '♫' },
  { label: 'Esportes', icon: '↗' },
];

export default function Page() {
  const [activeTab, setActiveTab] = useState('explorar');
  const [selectedEvent, setSelectedEvent] = useState(0);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [mode, setMode] = useState<'visitante' | 'organizador'>('visitante');
  const [entryScreen, setEntryScreen] = useState<'splash' | 'login' | 'app'>('splash');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [favoriteEvents, setFavoriteEvents] = useState<string[]>([events[0].title]);

  const event = events[selectedEvent];
  const toggleFavorite = (title: string) => {
    setFavoriteEvents((current) =>
      current.includes(title) ? current.filter((item) => item !== title) : [...current, title],
    );
  };

  if (entryScreen === 'splash') {
    return (
      <main className="app-shell entry-shell">
        <section className="entry-screen splash-screen" aria-label="Tela inicial do Acesso">
          <div className="splash-logo">
            <Accessibility size={35} strokeWidth={2.4} />
          </div>
          <p className="splash-overline">ACESSO</p>
          <h1>
            Caminhos que
            <br />
            <span>incluem.</span>
          </h1>
          <p className="splash-copy">
            Descubra lugares, eventos e experiências acessíveis para todos.
          </p>
          <div className="splash-art" aria-hidden="true">
            <div className="splash-orbit orbit-one" />
            <div className="splash-orbit orbit-two" />
            <div className="splash-glow" />
            <div className="splash-portal">
              <span className="portal-core" />
            </div>
            <div className="splash-path" />
            <div className="splash-marker">
              <Accessibility size={18} />
            </div>
            <div className="splash-dot dot-one" />
            <div className="splash-dot dot-two" />
          </div>
          <button className="entry-button" onClick={() => setEntryScreen('login')}>
            Começar <ArrowRight size={18} />
          </button>
          <p className="splash-footnote">Acessibilidade para viver mais.</p>
        </section>
      </main>
    );
  }

  if (entryScreen === 'login') {
    return (
      <main className="app-shell entry-shell">
        <section className="entry-screen login-screen" aria-label="Entrar no Acesso">
          <button
            className="entry-back"
            onClick={() => setEntryScreen('splash')}
            aria-label="Voltar"
          >
            ‹
          </button>
          <div className="login-heading">
            <div className="mini-logo">
              <Accessibility size={19} />
            </div>
            <p className="eyebrow">Bem-vinda de volta</p>
            <h1>Entre para continuar.</h1>
            <p>Salve seus lugares favoritos e encontre seu próximo rolê.</p>
          </div>
          <form
            className="login-form"
            onSubmit={(event) => {
              event.preventDefault();
              setEntryScreen('app');
            }}
          >
            <label>
              E-mail
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label>
              Senha
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            <button className="entry-button login-button" type="submit">
              <LogIn size={17} /> Entrar
            </button>
          </form>
          <button className="guest-button" onClick={() => setEntryScreen('app')}>
            Continuar como visitante
          </button>
          <p className="login-legal">Ao continuar, você concorda com nossos termos de uso.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <div className="app-frame">
        <header className="topbar">
          <div className="brand-mark" aria-label="Acesso logo">
            <Accessibility size={20} strokeWidth={2.7} />
          </div>
          <div className="mode-switch" role="tablist" aria-label="Modo do aplicativo">
            <button
              className={mode === 'visitante' ? 'active' : ''}
              onClick={() => setMode('visitante')}
            >
              Explorar
            </button>
            <button
              className={mode === 'organizador' ? 'active' : ''}
              onClick={() => setMode('organizador')}
            >
              Organizar
            </button>
          </div>
          <button className="icon-button" aria-label="Notificações">
            <Bell size={20} />
          </button>
        </header>

        {activeTab === 'favoritos' ? (
          <div className="screen-content favorites-screen">
            <section className="page-heading">
              <p className="eyebrow">Sua coleção</p>
              <h1>
                Lugares favoritos <Heart size={22} fill="currentColor" />
              </h1>
              <p>Tenha seus próximos caminhos sempre por perto.</p>
            </section>
            <div className="favorite-summary">
              <strong>{favoriteEvents.length}</strong>
              <span>experiências salvas</span>
              <Heart size={25} />
            </div>
            {favoriteEvents.length > 0 ? (
              <div className="event-list">
                {events
                  .filter((item) => favoriteEvents.includes(item.title))
                  .map((item) => (
                    <button
                      className="event-card"
                      key={item.title}
                      onClick={() => {
                        setSelectedEvent(events.indexOf(item));
                        setActiveTab('mapa');
                      }}
                    >
                      <div className={`event-visual ${item.color}`}>
                        <span>{item.icon}</span>
                        <div className="visual-grid" />
                        <div className="visual-pill">ACESSÍVEL</div>
                      </div>
                      <div className="event-details">
                        <div className="event-date">
                          <CalendarDays size={13} /> {item.date}
                        </div>
                        <h3>{item.title}</h3>
                        <p>
                          <MapPin size={14} /> {item.place}
                        </p>
                      </div>
                      <Heart className="heart favorite-heart" size={18} fill="currentColor" />
                    </button>
                  ))}
              </div>
            ) : (
              <div className="empty-state">
                <Heart size={30} />
                <h2>Nenhum favorito ainda</h2>
                <p>Explore eventos e toque no coração para salvar seus próximos rolês.</p>
                <button className="primary-action" onClick={() => setActiveTab('explorar')}>
                  Explorar eventos <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        ) : activeTab === 'perfil' ? (
          <div className="screen-content profile-screen">
            <section className="profile-hero">
              <div className="profile-avatar">M</div>
              <p className="eyebrow">Seu perfil</p>
              <h1>Marina Alves</h1>
              <p>Viva cada caminho com mais liberdade.</p>
              <button className="edit-profile">
                Editar perfil <ChevronRight size={15} />
              </button>
            </section>
            <section className="profile-stats">
              <div>
                <strong>{favoriteEvents.length}</strong>
                <span>Favoritos</span>
              </div>
              <div>
                <strong>04</strong>
                <span>Eventos vistos</span>
              </div>
              <div>
                <strong>02</strong>
                <span>Rotas feitas</span>
              </div>
            </section>
            <section className="profile-menu">
              <button>
                <Settings size={19} />
                <span>
                  <strong>Configurações</strong>
                  <small>Notificações e privacidade</small>
                </span>
                <ChevronRight size={17} />
              </button>
              <button>
                <CircleHelp size={19} />
                <span>
                  <strong>Ajuda e suporte</strong>
                  <small>Estamos aqui para ajudar</small>
                </span>
                <ChevronRight size={17} />
              </button>
            </section>
            <button className="logout-button" onClick={() => setEntryScreen('login')}>
              <LogIn size={17} /> Sair da conta
            </button>
          </div>
        ) : mode === 'visitante' ? (
          <div className="screen-content">
            <section className="greeting-row">
              <div>
                <p className="eyebrow">Quarta-feira, 14 de outubro</p>
                <h1>
                  Olá, Marina <span aria-hidden="true">✦</span>
                </h1>
              </div>
              <div className="avatar">M</div>
            </section>

            <section className="hero-card">
              <div className="hero-copy">
                <span className="hero-kicker">
                  <Sparkles size={14} /> Seu próximo rolê
                </span>
                <h2>
                  Encontre seu caminho
                  <br />
                  com mais liberdade.
                </h2>
                <p>Mapas acessíveis para você aproveitar cada momento.</p>
                <button className="hero-button" onClick={() => setSelectedEvent(0)}>
                  Explorar eventos <ArrowRight size={16} />
                </button>
              </div>
              <div className="hero-art" aria-hidden="true">
                <div className="sun"></div>
                <div className="arch arch-one"></div>
                <div className="arch arch-two"></div>
                <div className="person">
                  <div className="head"></div>
                  <div className="body"></div>
                  <div className="wheel wheel-one"></div>
                  <div className="wheel wheel-two"></div>
                </div>
                <div className="path-line"></div>
              </div>
            </section>

            <section className="search-box">
              <Search size={19} />
              <span>Buscar eventos, locais...</span>
              <button aria-label="Abrir filtros">
                <Menu size={18} />
              </button>
            </section>

            <section className="section-block">
              <div className="section-heading">
                <h2>Para você</h2>
                <button onClick={() => setShowAllEvents(!showAllEvents)}>
                  {showAllEvents ? 'Ver menos' : 'Ver todos'} <ChevronRight size={15} />
                </button>
              </div>
              <div className="event-list">
                {(showAllEvents ? events : events.slice(0, 2)).map((item, index) => (
                  <button
                    className="event-card"
                    key={item.title}
                    onClick={() => {
                      setSelectedEvent(index);
                      setActiveTab('mapa');
                    }}
                  >
                    <div className={`event-visual ${item.color}`}>
                      <span>{item.icon}</span>
                      <div className="visual-grid"></div>
                      <div className="visual-pill">ACESSÍVEL</div>
                    </div>
                    <div className="event-details">
                      <div className="event-date">
                        <CalendarDays size={13} /> {item.date}
                      </div>
                      <h3>{item.title}</h3>
                      <p>
                        <MapPin size={14} /> {item.place}
                      </p>
                    </div>
                    <Heart className="heart" size={18} />
                  </button>
                ))}
              </div>
            </section>

            <section className="section-block categories">
              <div className="section-heading">
                <h2>Descubra por categoria</h2>
                <CircleHelp size={17} />
              </div>
              <div className="category-row">
                {categories.map((category) => (
                  <button key={category.label} className="category">
                    <span>{category.icon}</span>
                    {category.label}
                  </button>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div className="screen-content organizer-screen">
            <section className="greeting-row">
              <div>
                <p className="eyebrow">Modo organizador</p>
                <h1>
                  Seu espaço, <span>mais acessível.</span>
                </h1>
              </div>
              <div className="avatar">M</div>
            </section>
            <div className="organizer-banner">
              <div>
                <span className="hero-kicker">
                  <Map size={14} /> Painel geral
                </span>
                <h2>
                  Vamos criar caminhos
                  <br />
                  que incluem todos.
                </h2>
              </div>
              <Accessibility size={64} strokeWidth={1.4} />
            </div>
            <div className="stats-grid">
              <div>
                <strong>04</strong>
                <span>Eventos ativos</span>
              </div>
              <div>
                <strong>12</strong>
                <span>Mapas criados</span>
              </div>
              <div>
                <strong>98%</strong>
                <span>Acessibilidade</span>
              </div>
            </div>
            <button className="primary-action">
              <span>+</span> Criar novo evento
            </button>
            <section className="section-block">
              <div className="section-heading">
                <h2>Seus eventos</h2>
                <button>
                  Ver todos <ChevronRight size={15} />
                </button>
              </div>
              {events.slice(0, 2).map((item) => (
                <div className="organizer-event" key={item.title}>
                  <div className={`mini-visual ${item.color}`}>{item.icon}</div>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.date} · 3 mapas</p>
                  </div>
                  <ChevronRight size={18} />
                </div>
              ))}
            </section>
          </div>
        )}

        {activeTab === 'mapa' && (
          <div className="map-overlay">
            <div className="map-top">
              <button className="back-button" onClick={() => setActiveTab('explorar')}>
                ‹
              </button>
              <div>
                <p className="eyebrow">Navegação acessível</p>
                <h2>{event.title}</h2>
              </div>
              <button className="icon-button">
                <Heart size={19} />
              </button>
            </div>
            <div className="map-canvas">
              <div className="map-label label-one">
                Auditório
                <br />
                <small>Principal</small>
              </div>
              <div className="map-label label-two">
                <Accessibility size={16} /> Banheiro
              </div>
              <div className="map-label label-three">
                <span>↗</span> Entrada
              </div>
              <div className="map-route"></div>
              <div className="map-pin">
                <MapPin size={25} fill="currentColor" />
              </div>
              <div className="map-controls">
                <button>
                  <LocateFixed size={19} />
                </button>
                <button>
                  <Search size={19} />
                </button>
              </div>
            </div>
            <div className="route-sheet">
              <div className="sheet-handle"></div>
              <p className="eyebrow">Rota recomendada</p>
              <h2>
                Entrada principal <ArrowRight size={20} /> Auditório
              </h2>
              <div className="route-meta">
                <span>
                  <strong>4 min</strong> a pé
                </span>
                <span>
                  <strong>180 m</strong> distância
                </span>
                <span className="accessible-tag">
                  <Accessibility size={14} /> acessível
                </span>
              </div>
              <button className="primary-action">
                Iniciar rota <ArrowRight size={17} />
              </button>
            </div>
          </div>
        )}

        <nav className="bottom-nav" aria-label="Navegação principal">
          <button
            className={activeTab === 'explorar' ? 'active' : ''}
            onClick={() => setActiveTab('explorar')}
          >
            <Home size={21} />
            <span>Explorar</span>
          </button>
          <button
            className={activeTab === 'mapa' ? 'active' : ''}
            onClick={() => setActiveTab('mapa')}
          >
            <Map size={21} />
            <span>Mapa</span>
          </button>
          <button
            className={activeTab === 'favoritos' ? 'active' : ''}
            onClick={() => setActiveTab('favoritos')}
          >
            <Heart size={21} />
            <span>Favoritos</span>
          </button>
          <button
            className={activeTab === 'perfil' ? 'active' : ''}
            onClick={() => setActiveTab('perfil')}
          >
            <UserRound size={21} />
            <span>Perfil</span>
          </button>
        </nav>
      </div>
    </main>
  );
}

void UsersRound;
void Settings;

void Compass;
void MapPin;
