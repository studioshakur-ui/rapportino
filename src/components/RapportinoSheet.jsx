// src/components/RapportinoSheet.jsx

import useRapportinoLogic from '../rapportino/useRapportinoLogic';

export default function RapportinoSheet({ crewRole }) {
  const {
    // header
    costr,
    setCostr,
    commessa,
    setCommessa,
    data,
    setData,
    statusLabel,
    capoSquadra,

    // lignes
    rows,
    handleChangeCell,
    handleAddRow,
    handleRemoveRow,
    prodottoTotale,

    // actions
    handleNewDay,
    handleOpenArchivio,
    handleSaveClick,
    handleValidateDay,
    handleExportPdf,

    // état sauvegarde / erreurs
    isSaving,
    lastSaveOk,
    saveErrorMsg,
    saveErrorDetails,
    showErrorDetails,
    setShowErrorDetails
  } = useRapportinoLogic(crewRole);

  return (
    <div className="mt-6 bg-white shadow-md rounded-lg p-6 rapportino-table print:bg-white">
      {/* Zone imprimable */}
      <div id="rapportino-print-area">
        <div className="flex justify-between mb-4">
          <div className="space-y-2">
            <div>
              <span className="font-semibold mr-2">COSTR.:</span>
              <input
                type="text"
                className="border-b border-slate-400 focus:outline-none px-1 min-w-[80px]"
                value={costr}
                onChange={(e) => setCostr(e.target.value)}
              />
            </div>
            <div>
              <span className="font-semibold mr-2">Commessa:</span>
              <input
                type="text"
                className="border-b border-slate-400 focus:outline-none px-1 min-w-[80px]"
                value={commessa}
                onChange={(e) => setCommessa(e.target.value)}
              />
            </div>
            <div>
              <span className="font-semibold mr-2">Capo Squadra:</span>
              <span className="px-1">{capoSquadra}</span>
            </div>
          </div>

          <div className="text-center">
            <h2 className="font-semibold text-lg">
              Rapportino Giornaliero – {crewRole}
            </h2>
          </div>

          <div className="space-y-2 text-right">
            <div>
              <span className="font-semibold mr-2">Data:</span>
              <input
                type="date"
                className="border border-slate-300 rounded px-2 py-1 text-sm"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
            <div>
              <span className="font-semibold mr-2">Stato:</span>
              <span className="inline-block px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold border border-yellow-300">
                {statusLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Tabella principale */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border rapportino-header-border">
            <thead>
              <tr className="bg-slate-50">
                <th className="border rapportino-header-border px-2 py-1 text-left text-xs">
                  CATEGORIA
                </th>
                <th className="border rapportino-header-border px-2 py-1 text-left text-xs">
                  DESCRIZIONE ATTIVITA'
                </th>
                <th className="border rapportino-header-border px-2 py-1 text-left text-xs">
                  OPERATORE
                </th>
                <th className="border rapportino-header-border px-2 py-1 text-left text-xs">
                  Tempo impiegato
                </th>
                <th className="border rapportino-header-border px-2 py-1 text-left text-xs">
                  PREVISTO
                </th>
                <th className="border rapportino-header-border px-2 py-1 text-left text-xs">
                  PRODOTTO
                </th>
                <th className="border rapportino-header-border px-2 py-1 text-left text-xs">
                  NOTE
                </th>
                <th className="border rapportino-header-border px-2 py-1 text-xs w-6">
                  -
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index}>
                  <td className="border rapportino-border px-2 py-1 align-top text-xs w-32">
                    <input
                      type="text"
                      className="w-full border-none focus:outline-none bg-transparent"
                      value={row.categoria}
                      onChange={(e) =>
                        handleChangeCell(index, 'categoria', e.target.value)
                      }
                    />
                  </td>
                  <td className="border rapportino-border px-2 py-1 align-top text-xs w-64">
                    <textarea
                      className="w-full border-none focus:outline-none bg-transparent resize-none leading-snug"
                      rows={3}
                      value={row.descrizione}
                      onChange={(e) =>
                        handleChangeCell(index, 'descrizione', e.target.value)
                      }
                    />
                  </td>
                  <td className="border rapportino-border px-2 py-1 align-top text-xs w-48">
                    <textarea
                      className="w-full border-none focus:outline-none bg-transparent resize-none leading-snug"
                      rows={3}
                      placeholder="Una riga per operatore"
                      value={row.operatori}
                      onChange={(e) =>
                        handleChangeCell(index, 'operatori', e.target.value)
                      }
                    />
                  </td>
                  <td className="border rapportino-border px-2 py-1 align-top text-xs w-40">
                    <textarea
                      className="w-full border-none focus:outline-none bg-transparent resize-none leading-snug"
                      rows={3}
                      placeholder="Stesse righe degli operatori"
                      value={row.tempo}
                      onChange={(e) =>
                        handleChangeCell(index, 'tempo', e.target.value)
                      }
                    />
                  </td>
                  <td className="border rapportino-border px-2 py-1 align-top text-xs w-20">
                    <input
                      type="text"
                      className="w-full border-none focus:outline-none bg-transparent text-right"
                      value={row.previsto}
                      onChange={(e) =>
                        handleChangeCell(index, 'previsto', e.target.value)
                      }
                    />
                  </td>
                  <td className="border rapportino-border px-2 py-1 align-top text-xs w-24">
                    <input
                      type="text"
                      className="w-full border-none focus:outline-none bg-transparent text-right"
                      value={row.prodotto}
                      onChange={(e) =>
                        handleChangeCell(index, 'prodotto', e.target.value)
                      }
                    />
                  </td>
                  <td className="border rapportino-border px-2 py-1 align-top text-xs">
                    <textarea
                      className="w-full border-none focus:outline-none bg-transparent resize-none leading-snug"
                      rows={3}
                      value={row.note}
                      onChange={(e) =>
                        handleChangeCell(index, 'note', e.target.value)
                      }
                    />
                  </td>
                  <td className="border rapportino-border px-2 py-1 align-top text-xs text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer azioni / info – NON stampato */}
      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between no-print">
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleNewDay}
            className="px-4 py-2 rounded border border-slate-300 hover:bg-slate-100 text-sm"
          >
            Nuova giornata
          </button>
          <button
            type="button"
            onClick={handleAddRow}
            className="px-4 py-2 rounded border border-slate-300 hover:bg-slate-100 text-sm"
          >
            + Aggiungi riga
          </button>
          <button
            type="button"
            onClick={handleOpenArchivio}
            className="px-4 py-2 rounded border border-slate-300 hover:bg-slate-100 text-sm"
          >
            Archivio
          </button>
        </div>

        <div className="flex-1 text-center text-sm font-semibold">
          Prodotto totale: {prodottoTotale}
        </div>

        <div className="flex gap-2 flex-wrap justify-end">
          <button
            type="button"
            onClick={handleSaveClick}
            disabled={isSaving}
            className="px-4 py-2 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-60"
          >
            {isSaving ? 'Salvataggio…' : 'Salva rapportino'}
          </button>
          <button
            type="button"
            onClick={handleValidateDay}
            disabled={isSaving}
            className="px-4 py-2 rounded border border-emerald-600 text-emerald-700 text-sm hover:bg-emerald-50 disabled:opacity-60"
          >
            Valida giornata
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isSaving}
            className="px-4 py-2 rounded bg-sky-600 text-white text-sm hover:bg-sky-700 disabled:opacity-60"
          >
            Esporta PDF
          </button>
        </div>
      </div>

      {/* Message d’erreur humain + détails techniques */}
      {saveErrorMsg && (
        <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3 no-print">
          <div>{saveErrorMsg}</div>
          {saveErrorDetails && (
            <button
              type="button"
              onClick={() => setShowErrorDetails((v) => !v)}
              className="mt-1 text-xs underline"
            >
              {showErrorDetails ? 'Nascondi dettagli tecnici' : 'Mostra dettagli tecnici'}
            </button>
          )}
          {showErrorDetails && saveErrorDetails && (
            <pre className="mt-2 text-xs bg-white border border-red-100 rounded p-2 overflow-x-auto whitespace-pre-wrap">
              {saveErrorDetails}
            </pre>
          )}
        </div>
      )}

      {lastSaveOk && !saveErrorMsg && (
        <div className="mt-3 text-xs text-emerald-700 no-print">
          Ultimo salvataggio riuscito. Puoi continuare a compilare o esportare il PDF.
        </div>
      )}
    </div>
  );
}
