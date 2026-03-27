# Day Blocks — Guida ai tipi di blocco

I blocchi si inseriscono nel campo `metadata` di `message_schedule` (colonna `jsonb`), nell'array `blocks`.  
Il campo `message` è il testo principale — renderizzato **dentro il box**.  
I blocchi appaiono **fuori dal box**, nell'ordine in cui sono definiti.

```json
{
  "message": "Testo del messaggio principale...",
  "blocks": [ ...blocchi... ]
}
```

Le risposte dell'utente vengono salvate automaticamente nello stesso record, in `metadata.responses`:

```json
{
  "responses": {
    "mood_day3": 4,
    "notes_day3": "Oggi è stato difficile ma ce l'ho fatta."
  }
}
```

---

## Blocchi disponibili

### `youtube` — Video YouTube

Mostra una thumbnail cliccabile. Al click si espande l'embed inline.

```json
{
  "type": "youtube",
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

| Campo | Tipo   | Note |
|-------|--------|------|
| `url` | string | Formati supportati: `watch?v=`, `youtu.be/`, `embed/` |

---

### `markdown` — Testo formattato

Renderizza Markdown completo. Vedi la sezione **Sintassi Markdown** più in basso.

```json
{
  "type": "markdown",
  "content": "## Titolo\n\nTesto con **grassetto** e *corsivo*."
}
```

| Campo     | Tipo   | Note |
|-----------|--------|------|
| `content` | string | Markdown completo — usa `\n` per andare a capo |

---

### `rating` — Valutazione con emoji

L'utente sceglie tra 5 emoji (da 😢 a 😄). **Auto-save al click.**

```json
{
  "type": "rating",
  "id": "mood_day3",
  "label": "Come ti sei sentito oggi?"
}
```

| Campo   | Tipo   | Obbligatorio | Note |
|---------|--------|:------------:|------|
| `id`    | string | ✅ | Chiave univoca per salvare in `responses` |
| `label` | string | ❌ | Domanda mostrata sopra le emoji |

Valori salvati: `1` 😢 → `2` 😕 → `3` 😐 → `4` 🙂 → `5` 😄

> ⚠️ L'`id` deve essere **univoco per messaggio** per evitare collisioni in `responses`.

---

### `text_input` — Campo di testo libero

Textarea con pulsante "Salva" che appare quando il contenuto è stato modificato.

```json
{
  "type": "text_input",
  "id": "notes_day3",
  "label": "Le tue riflessioni",
  "placeholder": "Cosa hai vissuto oggi?"
}
```

| Campo         | Tipo   | Obbligatorio | Note |
|---------------|--------|:------------:|------|
| `id`          | string | ✅ | Chiave univoca per salvare in `responses` |
| `label`       | string | ❌ | Etichetta sopra il campo |
| `placeholder` | string | ❌ | Testo grigio quando il campo è vuoto |

---

### `link_preview` — Anteprima link

Mostra una card cliccabile con immagine, titolo e descrizione estratti dai tag Open Graph della pagina. Durante il caricamento mostra uno skeleton animato. Se il sito non ha tag OG o il fetch fallisce, mostra il link testuale come fallback.

```json
{
  "type": "link_preview",
  "url": "https://www.example.com/articolo"
}
```

| Campo | Tipo   | Obbligatorio | Note |
|-------|--------|:------------:|------|
| `url` | string | ✅ | URL completo con `https://` |

> La qualità dell'anteprima dipende dai tag Open Graph del sito di destinazione. Siti come YouTube, Wikipedia e blog di settore li hanno quasi sempre. La risposta viene cachata 1 ora nel browser.

---

## Sintassi Markdown

Usata nel campo `content` del blocco `markdown` (e nel campo `message`).

### Testo

| Sintassi | Risultato |
|----------|-----------|
| `**testo**` | **grassetto** |
| `*testo*` | *corsivo* |
| `~~testo~~` | ~~barrato~~ |
| `` `codice` `` | codice inline |
| `[testo](url)` | link esterno |

### Headings

```
# H1 — grande, bold
## H2 — medio, bold
### H3 — piccolo, uppercase + spaziatura, grigio
#### H4 — piccolo, semibold
##### H5 — minuscolo, uppercase
###### H6 — minuscolo, grigio chiaro
```

### Liste

```
- elemento            → lista puntata
- altro elemento

1. primo              → lista numerata
2. secondo
```

### Citazione e separatore

```
> Testo della citazione — bordo sinistro, italic

---   →   linea separatrice
```

### Blocco di codice

````
```python
def saluta(nome):
    print(f"Ciao, {nome}!")
```
````

### Tabella (GFM)

```
| Colonna A | Colonna B | Colonna C |
|-----------|:---------:|----------:|
| sinistra  | centro    | destra    |
| valore    | valore    | valore    |
```

### Immagine

```
![Descrizione](https://esempio.com/foto.jpg)
```

---

## Esempio JSONB completo

```json
{
  "message": "💪 Giorno 3. Questi sono i giorni più duri, ma significa che il cambiamento sta avvenendo. Il corpo sta disintossicandosi. Resisti!",
  "blocks": [
    {
      "type": "youtube",
      "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    },
    {
      "type": "markdown",
      "content": "# Il momento della svolta\n\n## Perché il giorno 3 è il più difficile\n\nIl tuo corpo ha esaurito le riserve di glicogeno e sta imparando a usare i grassi come carburante. Questo processo si chiama **adattamento metabolico**.\n\n### Cosa succede dentro di te\n\n- 🔥 Il metabolismo si sta **riorganizzando**\n- 🧠 Il cervello cerca ancora zucchero — è normale sentirsi stanchi\n- 💧 Stai perdendo acqua in eccesso: **idratati bene**\n\n1. Bevi almeno 2 litri d'acqua\n2. Fai 10 minuti di camminata leggera\n3. Dormi almeno 7 ore\n\n> *\"Il momento in cui vuoi mollare è esattamente il momento in cui devi continuare.\"*\n\n---\n\n#### Confronto energetico\n\n| Fonte | Disponibilità | Durata |\n|-------|:-------------:|--------|\n| Glicogeno | ~~Alta~~ Esaurita | Breve |\n| Grassi | Alta | Lunga |\n| Proteine | Bassa | Emergenza |\n\n---\n\nUn esempio di routine mattutina:\n\n```\n07:00 — Bicchiere d'acqua a digiuno\n07:15 — 10 min stretching\n07:30 — Colazione proteica\n```\n\nDomani sarà già diverso. ~~Il peggio è passato~~ **Il meglio sta arrivando**. 🙌"
    },
    {
      "type": "link_preview",
      "url": "https://www.healthline.com/nutrition/ketosis"
    },
    {
      "type": "rating",
      "id": "mood_day3",
      "label": "Come ti sei sentito oggi?"
    },
    {
      "type": "text_input",
      "id": "notes_day3",
      "label": "Le tue riflessioni",
      "placeholder": "Cosa hai vissuto oggi? Hai avuto tentazioni? Come le hai gestite?"
    }
  ]
}
```
