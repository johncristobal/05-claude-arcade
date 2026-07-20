# Arcade vault

### Intro

1. Uso de Skills para guiar a Claude en la generación de interfaces consistentes y de calidad profesional.
2. Flujo Spec a Impl para escribir especificaciones técnicas antes de implementar, asegurando resultados predecibles y revisables.
3. Integración con Playwright MCP para automatización del navegador, pruebas y validaciones visuales en tiempo real.
4. Ciclo completo de desarrollo desde la inicialización del repositorio hasta la apertura de un Pull Request.
5. Implementación de páginas reales con flujos y diseños atractivos.

### Instalacion
Usarmeos nextjs
https://nextjs.org
desde el sitio viene el comando para crear proyecto nextjs
    - npx create-next-app@latest
Crea tooodo un framewoerk para trabajar

Para lanzar poryectr
    - npm run dev

Recuerda
claude
/init
Para cargar claude.md con lo que vaya leyebdo claude

### Inicializaciones
Creamos repo para subir proyecto - ✅

WOOOOOOW
Protection rules para rama main 
- Setteings - branches - main
- agregamos instruciones para que la rama main no pueda subir sin permisos

Agramos de nuvo skill de spec de profe
    - npx skills@latest add Klerith/fernando-skills 
Sa; y vielve a entrar

* Pull request
Ahora esta segura la rama main, para que no podamos subir sin pull reqeust
merge y borramos rama

### frontend skill
Skill para diseno de interfaz de usuario
    - npx skills add https://github.com/anthropics/skills --skill frontend-design

agregamos nota en claude.md
'## Skills'
Use /frontend-design to design user interface

### spec mvp 

/spec vamos a crear mvp de arcade bot. hay que implmentar las pantallas que se encuentran en @references/templates/.                                                            
Solamente es la parte visual. no hay que implementar ningun juego.

### mcp playwright
https://playwright.dev/docs/getting-started-mcp
instalmos:
    - claude mcp add playwright npx @playwright/mcp@latest

### resend for developers
Para enviar correos gratituitos
https://resend.com/pricing

