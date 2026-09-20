# OSGB Coach 2020

Applicazione statica pubblicata tramite GitHub Pages, con archivio esercizi e autenticazione Supabase.

## Importazione Instagram

In **Archivio esercizi → Importa da Instagram**:

- **Incolla link**: accetta URL HTTPS di un post/reel Instagram, elimina i parametri di tracciamento e prova a leggere la descrizione pubblica. Se il browser non può leggerla, propone testo incollato o screenshot. Non scarica né trascrive il video e non usa proxy esterni.
- **Carica screenshot**: riutilizza l'OCR italiano nel browser di **Importa da immagine**. Accetta fino a 5 immagini JPG/PNG/WEBP da 5 MB ciascuna, anche senza link.
- La bozza permette di correggere titolo, categoria, durata, obiettivo, spazio, materiale, descrizione, varianti e note. Le informazioni non riconosciute restano da compilare.
- Immagini originali e testo trascritto possono essere conservati separatamente. Gli originali sono nel bucket privato `exercise-images`; il dettaglio usa URL firmati temporanei.
- La fonte resta `instagram`, con etichetta e filtro **📱 Instagram**. La bozza viene inserita nell'archivio solo premendo **Salva esercizio**.

`exercise-import-utils.js` contiene parsing e validazione condivisi; `exercise-import.js` gestisce la bozza e gli upload; `exercise-admin.js` gestisce filtri e modifica; `exercise-mobile-fixes.js` visualizza fonti, note e trascrizione.

## Database

La migrazione incrementale in `supabase/migrations/` richiede la tabella `public.exercises` già esistente. Aggiunge `notes` e `source_images`, amplia le fonti ammesse a `manual`, `ai`, `local`, `image`, `web`, `instagram` e mantiene le policy di proprietà esistenti. Il primo originale viene riportato anche nei precedenti campi `source_image_path` e `source_image_name` per compatibilità. Applicare la migrazione prima del frontend aggiornato.

## Verifica

```sh
npm ci
npm test
```

I test usano un DOM locale e servizi simulati: coprono URL, parsing OCR, link leggibile/bloccato, più immagini, opzioni di salvataggio, modifica dello schema, filtri, annullamento, doppio salvataggio e pulizia dopo errori. Non verificano la disponibilità di un post Instagram reale o l'accuratezza OCR di ogni screenshot.
