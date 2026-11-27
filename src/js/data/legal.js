/* ═══ data/legal ═══
   Los textos legales de StrataFit, en español: el Aviso legal y condiciones de uso (terms) y la Política de privacidad
   (privacy), con las tarjetas de su resumen (cards), y el consentimiento informado para los datos de salud (consent), que es el
   texto entero de la segunda casilla de crear la cuenta. Es la única fuente de estos textos (en inglés, i18n/en-legal): va en un
   archivo aparte que se descarga al abrirlos (core/lazy) y se lo pasa a profile/legal, que los pinta. Su versión y su fecha
   de vigencia están en cloud/consent (LEGAL), que es también lo que se anota al aceptarlos.
   Cada texto va escrito como un Markdown mínimo, que lee profile/legal: «# » el título, «> » el lema, «## » cada apartado,
   «- » una lista, una línea en blanco entre párrafos, **negrita** y [enlaces](https://…). Los enlaces a otras pantallas de la
   app: (#privacy) la Política de privacidad, (#terms) el Aviso legal, (#consent) el consentimiento y (#contact) el contacto
   (Fallos y sugerencias).
   Las tarjetas, una por línea: «Título|Texto».
*/
import { setLegal } from '../profile/legal.js';
setLegal({
  terms: `
# Aviso legal y condiciones de uso

## 1. Identificación del titular

StrataFit es una aplicación de entrenamiento, nutrición y seguimiento de la actividad física desarrollada y gestionada por V. M. Rodriguez Mazuelas, identificado a continuación como el titular.

- Titular: V. M. Rodriguez Mazuelas.
- Contacto: desde la propia aplicación, en [Perfil → Fallos y sugerencias](#contact); para lo relativo a datos personales, con el tipo «Privacidad y datos».

Los usuarios pueden utilizar el canal de contacto indicado para comunicar incidencias, presentar consultas o reclamaciones y notificar posibles infracciones de derechos.

## 2. Objeto y finalidad de la aplicación

StrataFit ofrece herramientas destinadas a organizar entrenamientos, consultar ejercicios, registrar la alimentación, realizar un seguimiento de medidas y evolución física y facilitar la planificación de hábitos relacionados con la actividad física y el bienestar.

La aplicación tiene una finalidad informativa, organizativa y de seguimiento personal. No constituye un servicio de diagnóstico, tratamiento médico ni asesoramiento sanitario individualizado, ni está destinada a sustituir la atención de profesionales cualificados.

## 3. Acceso y condiciones de uso

El acceso y uso de StrataFit deben ajustarse a estas condiciones y a la legislación aplicable. Las condiciones contractuales se ponen a disposición del usuario antes de su aceptación.

Para crear una cuenta es necesario tener 16 años o más y aceptar expresamente estas condiciones. La aplicación conserva, vinculadas a la cuenta, la versión aceptada y la fecha de aceptación.

Durante la fase de pruebas, el servicio se ofrece gratuitamente para uso personal y no comercial a través de sus canales oficiales. No se genera ninguna obligación de pago por el mero uso de esta versión. Cualquier futura modalidad de pago estará sujeta a información previa y a una contratación expresa cuando corresponda.

El usuario puede dejar de utilizar la aplicación en cualquier momento, sin perjuicio de sus derechos sobre sus datos personales y de las disposiciones legales aplicables.

## 4. Fase de pruebas y disponibilidad del servicio

StrataFit se encuentra en fase de desarrollo y pruebas. Algunas funcionalidades pueden ser experimentales, incompletas o estar sujetas a cambios. Pueden producirse errores, interrupciones, problemas de sincronización, incompatibilidades o pérdidas totales o parciales de información.

No se garantiza una disponibilidad ininterrumpida ni la ausencia absoluta de errores. El titular procurará adoptar las medidas razonables y legalmente exigibles para mantener la seguridad, corregir incidencias y reducir los riesgos de pérdida de información.

Se recomienda conservar una copia independiente de los registros importantes y utilizar las opciones de exportación o copia de seguridad cuando estén disponibles.

El titular podrá realizar labores de mantenimiento, aplicar actualizaciones o modificar funcionalidades por motivos técnicos, legales, de seguridad o de mejora del servicio. Los cambios relevantes o la finalización de la fase de pruebas se comunicarán con antelación razonable cuando proceda y sea posible, respetando los derechos que correspondan a los usuarios.

La naturaleza experimental del servicio no elimina las obligaciones legales del titular ni los derechos irrenunciables de los usuarios.

## 5. Cuenta de usuario y seguridad

Cuando una funcionalidad requiera una cuenta, el usuario debe mantener la confidencialidad de sus credenciales y utilizar el servicio de forma legítima. Se recomienda utilizar una contraseña segura y diferente de las utilizadas en otros servicios.

El usuario debe comunicar al titular, tan pronto como sea razonablemente posible, cualquier sospecha de acceso no autorizado o uso indebido de su cuenta. El titular podrá adoptar medidas proporcionadas de protección ante incidentes de seguridad, sin perjuicio de sus propias obligaciones legales.

El usuario puede eliminar su cuenta y los datos asociados en cualquier momento desde la propia aplicación (Ajustes → Cuenta → Eliminar cuenta). Las cuentas que permanezcan dos años sin actividad se eliminan automáticamente junto con sus datos, en los términos de la Política de privacidad.

## 6. Uso permitido y conductas prohibidas

El usuario se compromete a utilizar StrataFit de manera lícita, responsable y respetuosa con los derechos de terceros. En particular, no está permitido:

- Acceder sin autorización a cuentas ajenas, datos privados o zonas restringidas.
- Eludir controles de acceso, interferir de forma maliciosa con el servicio o introducir código dañino.
- Realizar extracciones automatizadas abusivas que comprometan el funcionamiento del servicio o vulneren derechos, sin perjuicio de los usos amparados por la ley o por licencias abiertas.
- Suplantar identidades o emplear la aplicación con fines fraudulentos, ilícitos o perjudiciales para terceros.
- Reproducir o explotar comercialmente los elementos protegidos de StrataFit sin autorización, salvo que exista una licencia o excepción legal que lo permita.

## 7. Propiedad intelectual e industrial

© 2026 V. M. Rodriguez Mazuelas. Todos los derechos reservados sobre los contenidos y elementos propios de StrataFit.

El código fuente, la identidad visual, el diseño de la interfaz, los textos, ilustraciones, animaciones, elementos gráficos y demás contenidos originales están protegidos en la medida en que les resulte aplicable la normativa de propiedad intelectual e industrial. Los derechos corresponden al titular o, en su caso, a sus respectivos autores y licenciantes.

Se concede al usuario una autorización limitada, no exclusiva y no transferible para utilizar la aplicación con su finalidad personal y no comercial durante la fase de pruebas, sin transmisión de la titularidad de los derechos.

Salvo autorización previa y expresa, licencia aplicable o disposición legal que lo permita, no se autoriza la reproducción, modificación, distribución, comunicación pública, transformación, reventa o explotación comercial de los elementos protegidos de StrataFit. Esta limitación no afecta a los actos que la legislación permita sin autorización, ni a las libertades concedidas por las licencias de terceros.

El acceso al código en un repositorio público, por sí solo, no implica una cesión general de derechos. Si algún componente se distribuye con una licencia específica, sus términos prevalecerán respecto de dicho componente.

Las marcas, imágenes, bibliotecas, tipografías, bases de datos y demás materiales de terceros pertenecen a sus respectivos titulares y se rigen por sus condiciones y licencias. No se reivindican derechos exclusivos sobre los elementos de terceros ni sobre los datos propios del usuario.

## 8. Información sobre entrenamiento, salud y nutrición

Las rutinas, ejercicios, ilustraciones, animaciones, recomendaciones nutricionales, cálculos y demás contenidos de StrataFit tienen carácter general y orientativo. Pueden contener errores, simplificaciones o estimaciones y no se adaptan necesariamente a las circunstancias individuales de cada persona.

Antes de iniciar o modificar un programa de ejercicio o alimentación, especialmente si existen lesiones, enfermedades, embarazo, alergias, intolerancias, tratamientos médicos u otras circunstancias relevantes, se recomienda consultar a un profesional cualificado.

El usuario debe adecuar la intensidad, las cargas, la técnica, la alimentación y los descansos a su estado de salud, experiencia y capacidad física. Si experimenta dolor anormal, mareos, dificultad respiratoria intensa u otros síntomas preocupantes, debe interrumpir la actividad y solicitar asistencia adecuada. Ante una emergencia, debe contactar con los servicios de emergencia correspondientes.

Las estimaciones de calorías, macronutrientes, gasto energético y evolución corporal no constituyen mediciones clínicas ni garantizan un resultado concreto. No se garantiza la pérdida de peso, el aumento de masa muscular, la mejora del rendimiento ni ningún otro resultado físico determinado.

Las ilustraciones y animaciones de los ejercicios son referencias visuales y no sustituyen la supervisión técnica de un profesional cualificado cuando sea necesaria. La aplicación no debe emplearse como única fuente para adoptar decisiones médicas o nutricionales que puedan afectar a la salud.

## 9. Datos nutricionales y Open Food Facts

Los resultados de la búsqueda de alimentos obtenidos de Open Food Facts proceden de una base de datos colaborativa de acceso abierto. Su base de datos se ofrece bajo la licencia Open Database License (ODbL); los contenidos individuales están sujetos a la licencia aplicable a la base de datos y, cuando corresponda, a la Database Contents License (DbCL). Las imágenes de productos procedentes de Open Food Facts, cuando se utilicen, se rigen por la licencia Creative Commons Attribution-ShareAlike (CC BY-SA) aplicable y por los derechos de terceros que puedan concurrir.

La información puede ser incompleta, estar desactualizada o contener errores de transcripción, de composición o de identificación de productos. Deben comprobarse los valores nutricionales, los ingredientes y los alérgenos directamente en el etiquetado original del producto o con el fabricante, especialmente si existen alergias o necesidades dietéticas específicas.

StrataFit no está afiliada a Open Food Facts ni cuenta necesariamente con su respaldo. Los derechos y obligaciones de las licencias abiertas se mantienen respecto de los datos y recursos correspondientes.

Fuente: [Open Food Facts](https://world.openfoodfacts.org/). Licencia de la base de datos: [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). Consulte también sus [condiciones de reutilización](https://world.openfoodfacts.org/terms-of-use).

## 10. Contenidos introducidos por el usuario

El usuario conserva los derechos que le correspondan sobre sus registros, fotografías y demás contenidos que introduzca en StrataFit. Debe disponer de los derechos necesarios para aportar contenidos de terceros y evitar introducir información ilícita o que vulnere derechos ajenos.

El uso de estos contenidos para prestar las funcionalidades de la aplicación no implica una cesión general de derechos de propiedad intelectual al titular. El tratamiento de datos personales se rige por la Política de privacidad y la normativa aplicable.

## 11. Servicios y enlaces de terceros

StrataFit puede utilizar servicios externos para su funcionamiento, almacenamiento, autenticación o consulta de información, así como incluir enlaces a sitios de terceros.

Los servicios externos pueden estar sujetos a sus propias condiciones, políticas y limitaciones. El titular no controla necesariamente los contenidos de sitios externos ni garantiza su disponibilidad o exactitud. Ello no excluye las obligaciones que legalmente le correspondan por la selección, integración o utilización de dichos servicios.

## 12. Responsabilidad

El usuario debe hacer un uso prudente de la aplicación y valorar las limitaciones de las herramientas y contenidos que utiliza. En los términos permitidos por la legislación aplicable, el titular no responderá de perjuicios que sean exclusivamente atribuibles a un uso ilícito o manifiestamente inadecuado del servicio por el usuario, a actuaciones de terceros ajenas a su control razonable o a acontecimientos de fuerza mayor, cuando concurran los requisitos legales correspondientes.

Ninguna disposición de este aviso excluye o limita la responsabilidad por dolo, por daños personales imputables al titular cuando dicha limitación esté prohibida, por incumplimiento de obligaciones legales en materia de protección de datos ni por cualquier otro supuesto en que la responsabilidad no pueda excluirse o limitarse legalmente.

Se mantienen íntegramente los derechos y garantías irrenunciables que correspondan a los consumidores y usuarios.

## 13. Privacidad y protección de datos

El tratamiento de los datos personales asociados al uso de StrataFit se describe en la [Política de privacidad](#privacy) de la aplicación. En ella se informa sobre las finalidades del tratamiento, los derechos de los usuarios y los canales disponibles para ejercerlos.

La aceptación de las condiciones de uso no sustituye el consentimiento específico que deba recabarse para determinadas operaciones de tratamiento de datos personales, que la aplicación solicita por separado.

## 14. Suspensión o finalización del acceso

El titular podrá limitar o suspender el acceso cuando existan motivos justificados relacionados con un incumplimiento relevante de estas condiciones, un incidente de seguridad, una obligación legal o la protección de derechos de terceros. Las medidas deberán ser proporcionadas a las circunstancias y se comunicarán al usuario cuando proceda, salvo que existan razones legales o de seguridad que lo impidan.

La suspensión o finalización del acceso no supone una renuncia a los derechos del usuario sobre sus datos, ni autoriza una supresión contraria a la normativa aplicable.

## 15. Actualizaciones de las condiciones y evolución comercial

El presente aviso podrá actualizarse para reflejar cambios técnicos, funcionales, legales u organizativos. Se indicará la fecha de la versión vigente y se informará de los cambios relevantes en los términos exigidos por la normativa aplicable. Cuando un cambio requiera una nueva aceptación, la aplicación la solicitará de forma expresa.

Si en el futuro se ofrecen suscripciones o funcionalidades de pago, se facilitarán previamente sus condiciones específicas, precio total, duración, renovación, cancelación y derechos de desistimiento y reembolso cuando correspondan. El uso de la fase gratuita de pruebas no implica la aceptación anticipada de futuros cobros.

## 16. Legislación aplicable, reclamaciones y jurisdicción

Estas condiciones se rigen por la legislación española, sin perjuicio de las normas imperativas que protejan al usuario en su lugar de residencia habitual cuando resulten aplicables.

En caso de incidencia o controversia, el usuario puede dirigirse al canal de contacto indicado en este aviso. Podrá asimismo acudir a los organismos de consumo y a los tribunales que resulten competentes conforme a la normativa aplicable. No se establece una sumisión obligatoria a un tribunal que prive al consumidor de los fueros que legalmente le correspondan.

© 2026 V. M. Rodriguez Mazuelas — StrataFit. Todos los derechos reservados sobre los elementos propios, sin perjuicio de las licencias y derechos de terceros.
`,
  privacy: `
# Política de privacidad de StrataFit
> Tu progreso. Tus datos. Tu privacidad.

En StrataFit consideramos que la privacidad y la seguridad de tu información son una parte fundamental de tu experiencia. Nuestro objetivo es ofrecerte una herramienta de entrenamiento, nutrición y seguimiento de tu progreso sin recopilar información personal innecesaria.

Esta política explica qué información tratamos, para qué la utilizamos, cómo la protegemos y qué derechos tienes sobre ella. Complementa el [Aviso legal](#terms) de StrataFit. Durante la fase de pruebas, el servicio se ofrece para uso personal y gratuito, conforme al Aviso legal vigente. No se describen tratamientos vinculados a pagos o suscripciones que no estén implantados.

## 1. Responsable del tratamiento

- Aplicación: StrataFit.
- Responsable del tratamiento: V. M. Rodriguez Mazuelas, titular identificado en el Aviso legal.
- Contacto de privacidad: desde la propia aplicación, en [Perfil → Fallos y sugerencias](#contact), con el tipo «Privacidad y datos».

StrataFit no tiene designado un delegado de protección de datos.

El tratamiento se rige por el Reglamento (UE) 2016/679, Reglamento General de Protección de Datos (RGPD), y por la Ley Orgánica 3/2018, de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD).

## 2. Información que tratamos

**Datos de la cuenta.** Para registrarte necesitas un nombre de usuario y una contraseña. No es necesario proporcionar tu nombre y apellidos reales, correo electrónico personal, teléfono, documento de identidad, dirección postal, ubicación precisa ni datos bancarios para utilizar las funcionalidades descritas en esta política. Te recomendamos elegir un nombre de usuario que no te identifique directamente. Las credenciales se gestionan mediante Firebase Authentication, que para ello asocia a tu nombre de usuario un identificador técnico que no es un buzón de correo real; las contraseñas se protegen mediante mecanismos criptográficos y no se muestran al administrador de StrataFit. La única excepción es la contraseña temporal que el administrador genera si le pides restablecer la tuya: puede verla durante 24 horas para entregártela y la aplicación te obliga a sustituirla por una nueva al entrar.

**Entrenamiento, nutrición y progreso.** Según las funciones que utilices y la información que decidas introducir, podemos almacenar rutinas, ejercicios, sesiones, series, repeticiones, cargas, marcas, historial deportivo, comidas, calorías, macronutrientes, objetivos nutricionales, peso, medidas corporales y registros de evolución. Estos datos permiten ofrecer las funcionalidades solicitadas y hacer el seguimiento de tus objetivos. Determinados datos pueden revelar información relativa a la salud; por eso te pedimos tu consentimiento explícito antes de tratarlos, al crear la cuenta o, si tu cuenta es anterior a esta política, al abrir la aplicación. Su alcance se explica en el [consentimiento informado para el tratamiento de datos de salud](#consent).

**Perfil y preferencias.** Podemos almacenar el nombre de usuario, el sexo indicado en el perfil, la fotografía de perfil opcional, la apariencia, las unidades de medida, los ajustes de sonido, el estado del recorrido introductorio y otros ajustes que configures.

**Aceptación y consentimiento.** Guardamos, vinculadas a tu cuenta, la versión de las condiciones de uso que aceptaste y la del consentimiento que diste, con su fecha y hora y, si lo retiras, el momento en que lo hiciste.

**Fallos y sugerencias.** Si nos envías un aviso desde «Fallos y sugerencias», guardamos su texto, tu nombre de usuario, la versión de la aplicación y, solo si dejas marcada la casilla, datos técnicos del navegador y de los últimos errores, para poder atenderlo y contestarte.

**Información técnica.** Guardamos la categoría del sistema operativo del último dispositivo con el que has accedido a la cuenta (iOS/iPhone, Android u otros), para obtener estadísticas generales de compatibilidad. Los proveedores tecnológicos pueden tratar información técnica necesaria para la conexión, autenticación y seguridad, como la dirección IP, características del navegador e identificadores de sesión.

Aunque no se soliciten datos identificativos directos, el nombre de usuario y otra información asociada a una cuenta pueden constituir datos personales.

## 3. Finalidades del tratamiento

Utilizamos la información para crear y gestionar cuentas; autenticar el acceso; almacenar, recuperar y sincronizar registros; personalizar la experiencia; facilitar el seguimiento deportivo y nutricional; mostrar estadísticas personales; atender tus avisos y solicitudes; mantener la seguridad y disponibilidad del servicio; prevenir accesos no autorizados y abusos; mejorar la compatibilidad técnica; y cumplir las obligaciones legales aplicables.

StrataFit no vende, alquila ni comercializa tus datos personales, ni utiliza tus registros de entrenamiento, alimentación o evolución física con fines publicitarios.

## 4. Bases jurídicas del tratamiento

Según la finalidad, el tratamiento se fundamenta en:

- **Prestación del servicio (art. 6.1.b RGPD):** gestión de la cuenta, autenticación, almacenamiento, sincronización y funcionamiento de las funcionalidades solicitadas.
- **Consentimiento (art. 6.1.a):** información opcional como la fotografía de perfil.
- **Consentimiento explícito (art. 9.2.a, junto con la base del art. 6 que corresponda):** cuando se traten datos que tengan la consideración de datos relativos a la salud y esta sea la condición aplicable.
- **Interés legítimo (art. 6.1.f):** protección de la infraestructura, prevención de abusos, mantenimiento y estadísticas técnicas básicas de compatibilidad, previa valoración de la necesidad y del equilibrio con tus derechos.
- **Obligación legal (art. 6.1.c):** cumplimiento de obligaciones legales aplicables.

Puedes retirar el consentimiento en cualquier momento, sin afectar a la licitud del tratamiento anterior. No facilitar datos opcionales o retirar su consentimiento puede limitar las funciones que dependan de ellos, pero no las demás cuando puedan prestarse de forma independiente.

## 5. Almacenamiento y sincronización

StrataFit combina almacenamiento local en tu dispositivo y almacenamiento en la nube asociado a tu cuenta. La sincronización permite recuperar registros al cambiar de dispositivo, utilizarlos desde distintos dispositivos compatibles y reducir el riesgo de pérdida de información.

Durante la fase de pruebas existe el riesgo de pérdida total o parcial de los registros. La sincronización no garantiza una recuperación en todos los casos; recomendamos exportar periódicamente una copia de seguridad y conservarla de forma segura. Esta advertencia no limita tus derechos de protección de datos ni las obligaciones legales de StrataFit en materia de seguridad, disponibilidad y gestión de incidentes.

Utilizamos Firebase, de Google, para la autenticación, almacenamiento y sincronización. La base de datos principal de StrataFit está configurada en la región de Madrid, España. Otros servicios, como Firebase Authentication, pueden utilizar infraestructuras situadas fuera de España y del Espacio Económico Europeo (EEE). Consulta también el apartado sobre transferencias internacionales.

## 6. Acceso a tus datos y confidencialidad

El acceso ordinario a tus registros privados está asociado a tu cuenta mediante mecanismos de autenticación y reglas de seguridad. Tus registros privados no están destinados a otros usuarios.

Desde el panel de administración, el administrador puede consultar el nombre de usuario, el sexo indicado, la fecha de alta de la cuenta, las preferencias de apariencia, unidades y sonido, el estado del recorrido introductorio, la categoría del sistema operativo del último dispositivo utilizado y la constancia de tu aceptación y de tu consentimiento. También lee los avisos que envíes desde «Fallos y sugerencias», para contestarlos.

El panel ordinario de administración no permite consultar la contraseña que tú eliges, tus entrenamientos, rutinas, historial deportivo, registros de alimentación, medidas corporales, evolución física ni fotografía de perfil.

Los posibles accesos técnicos privilegiados a la infraestructura deberán limitarse a lo estrictamente necesario para la seguridad, resolución de incidencias justificadas o cumplimiento de obligaciones legales, bajo garantías de confidencialidad y control de acceso.

## 7. Fotografía de perfil

Añadir una fotografía es voluntario. Su finalidad es personalizar tu perfil y solo se sube a la nube tras tu autorización. No se muestra a otros usuarios ni desde el panel ordinario de administración. StrataFit no la utiliza para publicidad, reconocimiento facial, identificación biométrica, difusión pública ni entrenamiento de sistemas de inteligencia artificial.

Puedes retirarla en cualquier momento desde «Perfil». La retirada pone fin al tratamiento asociado a esa fotografía, sin perjuicio de los plazos residuales de conservación que resulten aplicables.

## 8. Búsqueda de alimentos y escáner de códigos de barras

Utilizamos Open Food Facts, una base de datos externa de productos alimenticios cuya base de datos se distribuye bajo licencia ODbL, para consultar información nutricional. La atribución y las condiciones de reutilización de la información se explican en el Aviso legal; el uso de este servicio también implica el tratamiento técnico asociado a la consulta. Al realizar una búsqueda se transmite el texto introducido o el código de barras escaneado, junto con la información técnica inherente a la conexión.

StrataFit no envía a Open Food Facts tus credenciales, medidas corporales, historial de entrenamiento ni registros personales de alimentación. Las imágenes de la cámara utilizadas para escanear códigos de barras se procesan localmente y no se transmiten a dicho proveedor.

El uso de la cámara requiere autorización y puedes revocarla desde los ajustes del dispositivo o navegador. Evita introducir información personal en el buscador de productos.

## 9. Seguridad de la información

StrataFit utiliza mecanismos de protección orientados a garantizar la confidencialidad, integridad y disponibilidad de la información, entre ellos autenticación mediante Firebase Authentication, comunicaciones HTTPS, protección criptográfica de credenciales, cifrado en reposo de los servicios compatibles, reglas de acceso por cuenta y mecanismos de prevención de abusos.

Ningún sistema tecnológico garantiza una seguridad absoluta. Utiliza una contraseña segura y única, evita compartir tus credenciales y cierra sesión cuando utilices un dispositivo compartido. Si detectas un posible acceso no autorizado, contacta con StrataFit.

## 10. Protección frente a accesos automatizados

StrataFit utiliza Firebase App Check y reCAPTCHA Enterprise de Google para proteger los servicios compatibles frente a solicitudes abusivas o procedentes de clientes no autorizados. Este sistema funciona habitualmente de forma invisible y puede tratar información técnica del dispositivo, navegador, conexión y solicitudes para evaluar riesgos de seguridad.

Google trata esa información por cuenta de StrataFit, como encargado del tratamiento, y únicamente para prestar y proteger este servicio.

## 11. Publicidad, cookies y almacenamiento local

StrataFit no muestra publicidad de terceros, no utiliza sistemas propios de seguimiento publicitario ni herramientas de analítica conductual como Google Analytics, y no elabora perfiles comerciales basados en tu actividad.

La aplicación utiliza tecnologías de almacenamiento local, identificadores de sesión y otros mecanismos necesarios para su funcionamiento, autenticación, seguridad y preferencias. Los servicios externos de seguridad, como reCAPTCHA, pueden utilizar cookies técnicas y tratar información del navegador y la conexión.

Las estadísticas internas sobre sistemas operativos tienen una finalidad técnica y no se utilizan para el seguimiento comercial. Si se incorporan tecnologías no necesarias que requieran consentimiento, se solicitará antes de activarlas.

## 12. Proveedores tecnológicos y destinatarios

- **Firebase (Google):** autenticación, almacenamiento, sincronización y protección de infraestructura. [Privacidad y seguridad de Firebase](https://firebase.google.com/support/privacy?hl=es).
- **Google reCAPTCHA Enterprise:** evaluación de riesgos y prevención de abusos, como encargado del tratamiento.
- **GitHub Pages:** alojamiento y distribución de la aplicación web. Puede registrar información técnica de conexión, como la dirección IP, por motivos de funcionamiento y seguridad. [Declaración de privacidad de GitHub](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).
- **Open Food Facts:** consultas de alimentos y códigos de barras. [Sitio oficial de Open Food Facts](https://world.openfoodfacts.org/).

La información comunicada a estos proveedores se limita a las finalidades descritas. Los proveedores que actúen como encargados tratarán los datos de acuerdo con las condiciones y garantías contractuales aplicables; cuando actúen como responsables independientes, sus propios tratamientos se regirán por sus políticas correspondientes.

También podremos comunicar información cuando exista una obligación legal o un requerimiento válido de una autoridad competente.

## 13. Transferencias internacionales de datos

Aunque la base de datos principal está configurada en España, determinados servicios tecnológicos pueden tratar información fuera del EEE. Firebase Authentication utiliza infraestructura ubicada en Estados Unidos, y la región de la base de datos no determina por sí sola la localización de todos los demás tratamientos.

Las transferencias internacionales que correspondan se realizarán de acuerdo con las garantías del RGPD. Google LLC, proveedor de Firebase y de reCAPTCHA Enterprise, declara estar adherida al Marco de Privacidad de Datos UE-EE. UU., reconocido por la decisión de adecuación de la Comisión Europea de 10 de julio de 2023, y sus condiciones de tratamiento de datos incorporan además las cláusulas contractuales tipo aprobadas por la Comisión Europea. GitHub declara en su declaración de privacidad que aplica cláusulas contractuales tipo a las transferencias internacionales de datos. Open Food Facts es una asociación con sede en Francia.

Puedes solicitar información adicional y acceso a las garantías aplicables a través del contacto de privacidad.

## 14. Diagnóstico y copias de seguridad

Los informes de diagnóstico y las copias de seguridad generadas como archivos no se envían automáticamente al administrador. Solo se comparten fuera del dispositivo cuando decides exportarlos o enviarlos mediante las opciones disponibles. La copia de seguridad en la nube se guarda en tu propia cuenta, junto al resto de tus registros, y solo tu cuenta puede leerla.

Antes de compartir un archivo, revisa su contenido: puede incluir información técnica o registros privados. Conserva las copias en un lugar seguro y controla quién puede acceder a ellas. Las copias que hayas exportado quedan fuera del control directo de StrataFit.

## 15. Conservación de datos

Los registros asociados a la cuenta se conservan mientras sean necesarios para prestar las funcionalidades solicitadas, sin perjuicio de tu derecho de supresión y de las obligaciones legales aplicables. Los datos opcionales se conservarán mientras subsista su finalidad y la base jurídica correspondiente.

Tras el borrado, podrán existir periodos limitados de conservación residual por razones justificadas de seguridad, copias de respaldo u obligaciones legales. Los registros técnicos de proveedores pueden tener sus propios periodos de conservación.

En concreto:

- **Cuenta y registros:** mientras la cuenta esté activa. Si pasan dos años sin actividad, la cuenta y todos sus datos se eliminan automáticamente. Se considera actividad abrir la aplicación con conexión a internet y la sesión iniciada.
- **Borrado, retirada del consentimiento y eliminación de la cuenta:** se ejecutan en el momento. Lo que pudiera quedar de una cuenta eliminada (por ejemplo, datos que otro dispositivo suba antes de enterarse) se borra en una limpieza automática mensual.
- **Avisos de «Fallos y sugerencias» y constancia de aceptación y consentimiento:** mientras exista la cuenta; se eliminan con ella.
- **Contraseñas temporales:** el administrador las ve durante 24 horas; una vez caducadas, se borran en la siguiente limpieza.
- **Proveedores:** según su documentación, Firebase puede tardar hasta 180 días en eliminar de sus sistemas, incluidas sus copias, los datos de autenticación de una cuenta borrada, y conserva unas semanas las direcciones IP que registra.

## 16. Control y eliminación de información

**Cerrar sesión.** Elimina la sesión y los datos locales privados de la cuenta en el dispositivo actual. Los registros sincronizados permanecen en la nube para que puedas recuperarlos al acceder de nuevo.

**Borrar todos los datos.** Elimina tus registros tanto del dispositivo como del almacenamiento sincronizado, junto con la fotografía de perfil, el sexo indicado y la copia de seguridad en la nube. No elimina la cuenta de acceso: se conservan tu usuario y contraseña, las preferencias de la aplicación, la constancia de aceptación y consentimiento y los avisos que hayas enviado. Antes de confirmar, la aplicación informa del alcance del borrado. Si quieres conservar los registros, realiza previamente una copia de seguridad.

**Retirar el consentimiento.** Desde «Privacidad» puedes retirar el consentimiento para tratar tus datos de salud. Como StrataFit no puede funcionar sin esos datos, al retirarlo se borran tus registros igual que con «Borrar todos los datos» y la aplicación deja de tratarlos; tu cuenta se conserva y, si quieres volver a usarla, te pediremos de nuevo el consentimiento.

**Eliminar tu cuenta.** Puedes eliminarla tú mismo desde Ajustes → Cuenta → Eliminar cuenta, o desde «Privacidad». Tras pedirte la contraseña y tu confirmación, se borran todos tus datos de la nube (registros, copia de seguridad, fotografía, perfil, constancia de aceptación y consentimiento y avisos enviados), la cuenta de acceso y los datos guardados en ese dispositivo. No se puede deshacer. Las copias exportadas por ti deben eliminarse manualmente de los lugares donde las hayas guardado.

## 17. Tus derechos

Conforme al RGPD, puedes ejercer los derechos de acceso, rectificación, supresión, limitación, portabilidad y oposición, cuando procedan; retirar el consentimiento; y no quedar sujeto a decisiones exclusivamente automatizadas que produzcan efectos jurídicos o efectos significativamente similares, en los términos previstos por la ley.

Muchos de ellos puedes ejercerlos directamente en la aplicación: consultar y corregir tus registros, obtener una copia en un formato reutilizable («Copia de seguridad» y «Exportar datos (CSV)»), borrar tus datos, retirar el consentimiento o eliminar la cuenta. Para lo demás, escríbenos por el [contacto de privacidad](#contact). Como el aviso se envía desde tu cuenta, normalmente no necesitamos más información para comprobar que eres su titular; si hiciera falta, pediremos solo la imprescindible. Las solicitudes se atenderán, con carácter general, en el plazo de un mes, ampliable en los casos previstos por el RGPD previa comunicación.

Si consideras que tus derechos no han sido respetados, puedes presentar una reclamación ante la [Agencia Española de Protección de Datos](https://www.aepd.es/).

## 18. Privacidad de menores de edad

StrataFit está dirigida a personas de 16 años o más: no está permitido crear una cuenta ni utilizar la aplicación por debajo de esa edad, y al registrarte declaras cumplirla. No recogemos la fecha de nacimiento ni comprobamos la edad con documentos. Si sabemos que una cuenta pertenece a una persona menor de 16 años, la eliminaremos junto con sus datos; si crees que es el caso, avísanos por el contacto de privacidad.

El tratamiento de información de menores se realizará conforme a la legislación aplicable. Cuando sea necesaria la intervención o autorización de sus representantes legales, deberá obtenerse antes de tratar los datos correspondientes.

## 19. Cambios en esta política

Esta política podrá actualizarse para reflejar nuevas funcionalidades, cambios tecnológicos, mejoras de seguridad, modificaciones legislativas o cambios en las prácticas de tratamiento. Cuando se produzcan cambios relevantes, informaremos a los usuarios mediante los canales disponibles en la aplicación y solicitaremos nuevos consentimientos cuando sean necesarios.

La versión vigente estará disponible en el apartado «Privacidad» de StrataFit. Puedes consultar también el [Aviso legal](#terms) para conocer las condiciones generales de utilización de la aplicación.

## 20. Nuestro compromiso

StrataFit se compromete a tratar tu información de manera responsable, transparente y respetuosa con tu privacidad. Tus datos de entrenamiento, alimentación y evolución física tienen como finalidad ayudarte a alcanzar tus objetivos personales, no convertirse en un producto comercial.

**Tu esfuerzo te pertenece. Tu progreso también.**

StrataFit — Entrenamiento, nutrición y progreso personal.
`,
  consent: `
# Consentimiento informado para el tratamiento de datos de salud

Es el consentimiento que das al marcar la casilla «Acepto el tratamiento de mis datos de salud por StrataFit» al crear tu cuenta o al aceptar las condiciones. Aquí te explicamos qué datos son, para qué los usamos, quién puede verlos y cómo puedes retirarlo. Complementa la [Política de privacidad](#privacy).

## 1. Qué consientes

Consientes de forma expresa que StrataFit trate los datos relativos a tu salud que decidas introducir en la aplicación, con la única finalidad de gestionar tu seguimiento físico, deportivo y nutricional.

## 2. Qué datos son

Son los registros que introduces y lo que la aplicación calcula a partir de ellos, porque pueden revelar información sobre tu salud:

- **Entrenamiento:** rutinas, ejercicios, series, repeticiones, cargas, esfuerzo percibido, notas y marcas.
- **Nutrición:** comidas, calorías, macronutrientes, agua y objetivos nutricionales.
- **Cuerpo:** peso, medidas corporales y los datos del perfil que se usan en los cálculos, como el sexo, la edad, la altura, el nivel de actividad y el objetivo.
- **Progreso:** historial, récords, logros y estadísticas que salen de lo anterior.

La aplicación no te pide diagnósticos, enfermedades ni medicación. Te recomendamos no escribirlos en las notas.

## 3. Para qué los usamos

Solo para prestarte las funciones de StrataFit: guardar y mostrar tus registros; calcular cifras como calorías, macronutrientes, cargas sugeridas y progresión; enseñarte tu evolución y tus récords; sincronizarlos entre tus dispositivos; y guardar tu copia de seguridad en la nube.

No los vendemos, no los usamos con fines publicitarios y no se toman con ellos decisiones automatizadas que produzcan efectos jurídicos sobre ti.

## 4. Base jurídica

Tu consentimiento explícito (artículo 9.2.a del Reglamento General de Protección de Datos), junto con la base del artículo 6 que corresponda a cada uso, como explica la [Política de privacidad](#privacy).

## 5. Quién puede verlos y dónde se guardan

Tus registros están asociados a tu cuenta y protegidos mediante autenticación y reglas de seguridad: solo tú puedes verlos. El administrador de StrataFit no ve tus entrenamientos, tus comidas, tus medidas ni tu copia de seguridad; solo los datos de la cuenta que detalla la Política de privacidad, como el sexo indicado en el perfil.

Se guardan en tu dispositivo y en la nube asociada a tu cuenta (Firebase, de Google, con la base de datos principal en Madrid). Los proveedores que intervienen y las transferencias internacionales se explican en la Política de privacidad.

## 6. Si no lo das

Darlo es voluntario. Como la función de StrataFit es precisamente registrar y analizar estos datos, sin tu consentimiento no puedes usar la aplicación con tu cuenta: hasta que lo des, no muestra ni sincroniza tus registros. Aun así, puedes exportar una copia, borrar tus datos o eliminar tu cuenta en cualquier momento.

## 7. Cómo retirarlo

Puedes retirarlo cuando quieras desde Privacidad → Tus datos → Retirar el consentimiento. Al hacerlo, la aplicación deja de tratar estos datos y borra tus registros de tu dispositivo y de tu cuenta, también de tus otros dispositivos en cuanto se conecten; tu usuario se conserva.

Retirarlo no afecta a la licitud del tratamiento anterior. Si vuelves a darlo, empezarás con la cuenta vacía: si quieres conservar tus registros, exporta antes una copia.

## 8. Constancia de tu consentimiento

Guardamos, vinculadas a tu cuenta, la versión de este texto que aceptaste, la fecha y la hora y, si lo retiras, el momento en que lo hiciste. Puedes consultarlo en Privacidad → Tus datos. Si este texto cambia de forma que haga falta un consentimiento nuevo, te lo pediremos al abrir la aplicación.

## 9. Tus derechos y contacto

Además de retirar el consentimiento, puedes ejercer los derechos de acceso, rectificación, supresión, limitación, portabilidad y oposición, como se explica en la Política de privacidad. Para cualquier duda o solicitud, escríbenos por el [contacto de privacidad](#contact).
`,
  cards: `
Registro con los datos imprescindibles|Sin necesidad de facilitar tu nombre real, correo electrónico o teléfono.
Información protegida|Tus registros están asociados a tu cuenta mediante mecanismos de autenticación y seguridad.
Almacenamiento y sincronización|Base de datos configurada en Madrid y sincronización entre dispositivos. Otros servicios pueden operar fuera de España.
Sin publicidad ni seguimiento comercial|No vendemos tus datos ni los utilizamos para personalizar anuncios.
Escáner privado|Las imágenes utilizadas para escanear alimentos se procesan en tu dispositivo.
Tú tienes el control|Gestiona, exporta o elimina tu información y ejerce tus derechos de privacidad.
`
});
