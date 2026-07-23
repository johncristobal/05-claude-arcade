# Hooks & mcp

### Intro

Hooks — automatizar linting y formato cuando el AI crea código
MCPs — conecta y administra conexiones con otros agentes y servicios
Juego de Asteroides — implementación completa de un videojuego
Leaderboard — tabla de clasificaciones con persistencia de datos

### hooks noti

https://code.claude.com/docs/en/hooks

Ejecutar scriupt antes, despues o mediante ejecucion del LLM

- cuando claude termina
- formatear codigo

/Users/johncris/Documents/pin.mp3. Let's create a hook.
When you finished or need something from me, play this mp3

- Podemos crear el hook con la instruccion directamente

### hooks linter y prettier

Now, let's create another hook.
When a file(React or markdown) is created or saved, check when Prettier and Linter ESLint  
Just for this project

### mcps

OJO - LLM accede solo a desarrollo, NO PROD
- apoicamos migraciones a prod 

https://supabase.com/dashboard/project/uworqrfrwyjoglantqhi?connectTab=mcp&showConnect=true
Creamos base datos supabse
- creamos cuenta y cramos entiorno

- desde la consiola
claude mcp add --scope project --transport http supabase "https://mcp.supabase.com/mcp?project_ref=uworqrfrwyjoglantqhi"
/mcp para habiliatar csupabse
authenticate y listo
ya podemos tirar comando en claude para preguntar 

