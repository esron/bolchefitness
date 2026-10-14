import { useState, useRef } from 'react';
import {
  Download,
  Upload,
  Smartphone,
  ShieldCheck,
  HardDrive,
  ArrowDownToLine,
  RefreshCw,
  Info,
} from 'lucide-react';
import { validateBackup, localDay, type State } from '../domain';
import { type Tracker } from '../useTracker';
import { type Pwa } from '../pwa';
import { Modal, PageHeading } from '../components/UI';
export function Settings({ tracker, pwa }: { tracker: Tracker; pwa: Pwa }) {
  const [backup, setBackup] = useState<State | null>(null);
  const [error, setError] = useState('');
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const exportBackup = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(tracker.state, null, 2)], { type: 'application/json' })
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `bolchefitness-${localDay(new Date())}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <>
      <PageHeading
        eyebrow="SEU APLICATIVO"
        title="Configurações"
        description="Tudo no seu dispositivo. Tudo sob seu controle."
      />
      <div className="settings-grid">
        <section className="settings-card">
          <div className="settings-icon">
            <Smartphone size={24} />
          </div>
          <h2>Leve para o treino</h2>
          <p>
            Instale na tela inicial para abrir como um aplicativo. Depois do primeiro carregamento,
            você pode treinar sem internet.
          </p>
          {pwa.standalone ? (
            <span className="success-inline">
              <ShieldCheck size={17} />
              Aplicativo instalado
            </span>
          ) : pwa.canInstall ? (
            <button className="primary" onClick={() => void pwa.install()}>
              <ArrowDownToLine size={18} />
              Instalar aplicativo
            </button>
          ) : (
            <div className="install-instructions">
              <p>
                <strong>Android:</strong> no menu do navegador, toque em “Instalar aplicativo” ou
                “Adicionar à tela inicial”.
              </p>
              <p>
                <strong>iPhone:</strong> abra no Safari, toque em Compartilhar e depois em
                “Adicionar à Tela de Início”.
              </p>
            </div>
          )}
        </section>
        <section className="settings-card">
          <div className="settings-icon">
            <HardDrive size={24} />
          </div>
          <h2>Backup da sua rotina</h2>
          <p>
            Exporte suas fichas e histórico para guardar uma cópia ou levar os dados para outro
            dispositivo.
          </p>
          <div className="backup-actions">
            <button className="primary" onClick={exportBackup}>
              <Download size={18} />
              Exportar backup
            </button>
            <label className="secondary import-button">
              <Upload size={18} />
              Importar backup
              <input
                ref={input}
                type="file"
                accept=".json,application/json"
                aria-label="Importar backup"
                disabled={tracker.pending}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setError('');
                  try {
                    setBackup(validateBackup(JSON.parse(await file.text())));
                  } catch {
                    setError(
                      'Backup inválido. Escolha um arquivo JSON exportado pelo Bolchefitness, com versão e dados válidos.'
                    );
                  }
                  e.target.value = '';
                }}
              />
            </label>
          </div>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
        </section>
        <section className="settings-card">
          <div className="settings-icon">
            <ShieldCheck size={24} />
          </div>
          <h2>Dados que ficam com você</h2>
          <p>
            Suas fichas e treinos são salvos neste navegador, neste dispositivo. Não há conta nem
            envio dos seus dados para um servidor.
          </p>
          <div className="info-note">
            <Info size={18} />
            <p>
              Limpar os dados do site pode apagar seu histórico. Faça backups regularmente. Outro
              navegador ou celular terá seus próprios dados.
            </p>
          </div>
          {'storage' in navigator && navigator.storage.persist && (
            <button
              className="secondary"
              onClick={async () => {
                setPersisted(await navigator.storage.persist());
              }}
            >
              Solicitar armazenamento persistente
            </button>
          )}
          {persisted !== null && (
            <p className="small muted">
              {persisted
                ? 'O navegador concedeu armazenamento persistente.'
                : 'O navegador não concedeu persistência. Continue fazendo backups.'}
            </p>
          )}
        </section>
        <section className="settings-card about-card">
          <span className="brand-mark">
            b<span>f</span>
          </span>
          <h2>Bolchefitness</h2>
          <p>Seu treino, no seu ritmo.</p>
          <span className="version">VERSÃO 1.0 · FEITO PARA CONTINUAR</span>
          {pwa.hasUpdate && (
            <button
              className="secondary"
              disabled={tracker.pending || tracker.state.sessions.some((s) => !s.endedAt)}
              onClick={pwa.applyUpdate}
            >
              <RefreshCw size={17} />
              Atualizar aplicativo
            </button>
          )}
          {pwa.hasUpdate && tracker.state.sessions.some((s) => !s.endedAt) && (
            <p className="small muted">Finalize ou descarte o treino para aplicar a atualização.</p>
          )}
        </section>
      </div>
      {backup && (
        <Modal title="Substituir dados deste dispositivo?" onClose={() => setBackup(null)}>
          <p className="dialog-copy">
            Este backup contém {backup.sequences.length} sequências e {backup.sessions.length}{' '}
            sessões. A importação substituirá todas as fichas e o histórico atuais, inclusive um
            treino em andamento.
          </p>
          <p className="small muted">
            Exporte os dados atuais antes de continuar se quiser preservá-los.
          </p>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setBackup(null)}>
              Cancelar
            </button>
            <button
              className="primary"
              disabled={tracker.pending}
              onClick={async () => {
                if (await tracker.update(() => backup)) setBackup(null);
              }}
            >
              Substituir dados
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
