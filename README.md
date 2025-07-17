

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

## /welcome/EmailCheckForm
Questa pagina permette di inserire una email all'utente, se questa email risulta:

 - già presente nel DB: si passerà al login
 - non presente nel DB: si passerà al signup

È inoltre presente un controllo che verifica se il testo inserito corrisponde effettivamente ad una email.

## /welcome/LoginPassword
Questa pagina permette ad un utente che ha già effettuato un signup di loggarsi nell'app.
Se il login avviene con successo verrà salvata una variabile nel DB locale tramite AsyncStorage che mantiene la sessione. Viene inoltre pulito il DB locale e aperta una connessione websocket.

## /welcome/Signup
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
Contiene dei metodi che permettono di aggiornare dei campi nelle varie pagine dell'applicazione quando avviene un determinato evento (ad esempio quando si riceve un messaggio aggiorna l'ultimo messaggio ricevuto da questa chat nel riquadro nella lista delle chat)

# Build guide

## Android

```
npx expo install --fix
npx expo prebuild --clean

Sistema AndroidManifest.xml
Crea local.properties dentro cartella android/ 
   con questo contenuto: sdk.dir=C:\\Users\\ISRaiken\\AppData\\Local\\Android\\Sdk

npx expo run:android --clear-build-cache OR npx expo run:android
```

e in caso di problemi

```
sudo apt install openjdk-17-jdk -y

nano ~/.bashrc

export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH="$JAVA_HOME/bin:$PATH"

export PATH=$PATH:/mnt/c/Users/ISRaiken/AppData/Local/Android/Sdk/cmake/3.22.1/bin

# Android SDK Configuration
# Set the base path (adjust if your Windows path is different)
export ANDROID_HOME=/mnt/c/Users/ISRaiken/AppData/Local/Android/Sdk

# Add essential tools to PATH based on your Windows setup
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/emulator

# Add command-line tools (usually preferred over older 'tools')
# Check the actual folder name inside C:\Users\ISRaiken\AppData\Local\Android\Sdk\cmdline-tools
# It might be 'latest' or a version number like '11.0'
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin #<-- Adjust 'latest' if needed

# Add build tools (dynamically finds the latest installed version)
export PATH=$PATH:$ANDROID_HOME/build-tools/$(ls $ANDROID_HOME/build-tools | sort -r | head -n 1)

# Add older tools directories (less likely needed, but included based on your list)
# export PATH=$PATH:$ANDROID_HOME/tools
# export PATH=$PATH:$ANDROID_HOME/tools/bin

source ~/.bashrc

npm install
npx expo run:android
```