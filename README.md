

Note:
1) Build web: npx expo export -p web
2) ...

# Messanger Client

I principali componenti dell'applicazione si trovano in:

 - /app: schermate dell'app
 - /assets: immagini e fonts
 - /constants: colori per i temi
 - /context: temi dell'app

# /app

## index
Contiene una pagina di benvenuto molto semplice. Se l'utente è già loggato, viene reindirizzato automaticamente alla schermata dei messaggi.

## _layout.jsx
Serve per expo-router, non tocchiamola gentilmente

## ChatList
È la pagina principale dell'applicazione. Mostra la lista delle chat con le quali l'utente ha un contatto. Se eseguita su schermi di piccole dimensioni si ridimensiona a dovere, mentre su schermi più grandi mostra anche inclusa al suo interno la pagina ChatContent.

## ChatContent
Si tratta della pagina che effettivamente si occupa di gestire e mostrare il contenuto effettivo di una chat. Viene integrata dentro ChatList per il lato responsive

## /loginSignup/EmailCheckForm
Questa pagina permette di inserire una email all'utente, se questa email risulta:

 - già presente nel DB: si passerà al login
 - non presente nel DB: si passerà al signup

È inoltre presente un controllo che verifica se il testo inserito corrisponde effettivamente ad una email.

## /loginSignup/LoginPassword
Questa pagina permette ad un utente che ha già effettuato un signup di loggarsi nell'app.
Se il login avviene con successo verrà salvata una variabile nel DB locale tramite AsyncStorage che mantiene la sessione. Viene inoltre pulito il DB locale e aperta una connessione websocket.

## /loginSignup/Signup
Questa pagina React Native implementa un modulo di registrazione utente con campi per password, conferma password, nome, cognome e handle univoco. Gestisce la visibilità della password tramite icone interattive, verifica automaticamente la disponibilità dell'handle tramite una chiamata API, e include la validazione del form prima dell'invio. Se l'utente è già loggato, viene reindirizzato automaticamente alla schermata dei messaggi.

## /messages
Le pagine al suo interno sono utilizzate per gestire le route delle varie chat. Permettono di avere quindi:

 - lista delle chat: http://localhost:8081/messages
 - chat specifica: http://localhost:8081/messages?chatId=2000000000000000000

## /utils/APImethods
Contiene tutti i metodi per effetturare chiamate all'API

## /utils/localDatabaseMethods
Contiene i metodi per gestire il DB locale

## /utils/JsonParser
Contiene metodi di supporto alle chiamate API. Permette al codice di interfacciarsi correttamente ai risultati delle chiamate API

## /utils/webSocketMethods
Contiene i metodi per gestire le websocket (apertura, chiusura, invio e ricezione messaggi da esse)

## /utils/EventEmitter
<<<<<<< HEAD
Contiene dei metodi che permettono di aggiornare dei campi nelle varie pagine dell'applicazione quando avviene un determinato evento (ad esempio quando si riceve un messaggio aggiorna l'ultimo messaggio ricevuto da questa chat nel riquadro nella lista delle chat)
=======
Contiene dei metodi che permettono di aggiornare dei campi nelle varie pagine dell'applicazione quando avviene un determinato evento (ad esempio quando si riceve un messaggio aggiorna l'ultimo messaggio ricevuto da questa chat nel riquadro nella lista delle chat)
>>>>>>> 02241ce73b39b6ca34732943404cf29c146371aa
