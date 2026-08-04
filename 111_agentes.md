# Seccion 11: Agentes

Fundamentos de agentes y configuración del proyecto Arcade Vault con claude.md
Creación de agentes especializados: game-planner, game-jam y skin-designer
Pruebas e iteración sobre cada agente para validar su comportamiento
Implementación de controles táctiles y ajustes del GamePad para experiencia móvil
Agente mobile-porter para adaptar el proyecto a dispositivos móviles

### Introduccion

Treminal - muy general, puede llegar a respuestas dumb

Agente - trabajador focalizado
- contexto limpio
- paralelismo
- reusable

* Aisla contexto - propia ventana son contaminar
* Especalizar comportamiento - security, exercise, uitester
* restringir herramientas
* Definir experto en X, que se puede reutilizar

Patron orquestador - trabajador
Agente principal (orquesta)
Subagentes - trabajador con su propio contexto

### crear agente
Tal cual le decimos a claude - crea un agente con abc

necesito que me ayudaes a crear un agente nuevo que se llame @skin-designer: revisa que todo el juego tenga al menos 3 skins, neon, retro y clasico (default) 
El objetivo del agente es ayudarme a configurar los temas mencionados para que tdos los jugos cumplan con estos skins

aplicamos agent
necesito que creemos skins para el juego de arkanoid y serpiente. por favlor lanza dos agentes del @.claude/agents/skin-designer/, uno para cada juego   

### disp moviles
lanzamos spec para crear una sollicion para dispositivos moviles
Se busca colocar un pad en la parte de abajo del canvas solo para dispositivos moviles
