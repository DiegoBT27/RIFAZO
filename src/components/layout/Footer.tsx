
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText } from 'lucide-react';

export default function Footer() {
  const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  return (
    <>
      <footer className="bg-slate-900 text-slate-200 py-6 text-center mt-auto">
        <div className="container mx-auto px-4">
          <p className="text-sm">
            © 2025 RIFAZO. Todos los derechos reservados.
          </p>
          <div className="text-xs mt-2 space-x-4">
              <Button
                variant="link"
                className="text-slate-400 hover:text-white h-auto p-0"
                onClick={() => setIsTermsOpen(true)}
              >
                Términos y Condiciones
              </Button>
              <Button
                variant="link"
                className="text-slate-400 hover:text-white h-auto p-0"
                onClick={() => setIsPrivacyPolicyOpen(true)}
              >
                Políticas de Privacidad
              </Button>
            </div>
        </div>
      </footer>

      {/* Privacy Policy Dialog */}
      <Dialog open={isPrivacyPolicyOpen} onOpenChange={setIsPrivacyPolicyOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center"><FileText className="mr-2 h-5 w-5 text-primary" />Políticas de Privacidad de la Aplicación RIFAZO</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4 my-4">
            <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground space-y-3 text-xs">
              <p><strong>Última actualización:</strong> [Junio 2025]</p>
              <p>En RIFAZO, nos comprometemos a proteger la privacidad y los datos personales de nuestros usuarios. Esta política explica qué información recopilamos, cómo la usamos y qué derechos tienes sobre tus datos.</p>
              <h4>1. INFORMACIÓN QUE RECOPILAMOS</h4>
              <p>Al usar RIFAZO, podemos recopilar la siguiente información:</p>
              <ul className="list-disc list-inside space-y-1 pl-4">
                <li>Nombre de usuario</li>
                <li>Cédula de identidad</li>
                <li>Correo electrónico (si aplica)</li>
                <li>Número de teléfono (si lo proporciona el administrador)</li>
                <li>Historial de participación en rifas dentro de la app</li>
              </ul>
              <p>No realizamos cobros o pagos desde la app. Todo esto lo maneja el administrador de la rifa.</p>
              <h4>2. USO DE LA INFORMACIÓN</h4>
              <p>La información recolectada se utiliza para:</p>
              <ul className="list-disc list-inside space-y-1 pl-4">
                <li>Gestionar el acceso y uso de la app</li>
                <li>Asociar al usuario con las rifas en las que participa</li>
                <li>Permitir la comunicación con el administrador de cada rifa</li>
                <li>Mejorar la experiencia del usuario dentro de la plataforma</li>
              </ul>
              <h4>3. COMPARTIR INFORMACIÓN</h4>
              <p>RIFAZO no vende, alquila ni comparte tus datos personales con terceros. La única interacción externa es mediante WhatsApp, cuando contactas directamente con un administrador.</p>
              <h4>4. SEGURIDAD</h4>
              <p>Tomamos medidas técnicas y organizativas razonables para proteger tus datos contra el acceso no autorizado, pérdida o destrucción. Sin embargo, al ser una app que depende de plataformas externas como WhatsApp, no podemos garantizar seguridad fuera del entorno de la app.</p>
              <h4>5. RETENCIÓN DE DATOS</h4>
              <p>Tus datos se almacenarán mientras mantengas tu cuenta activa. Si decides eliminar tu cuenta, también se eliminarán tus datos asociados.</p>
              <h4>6. TUS DERECHOS</h4>
              <p>Tienes derecho a:</p>
              <ul className="list-disc list-inside space-y-1 pl-4">
                <li>Acceder a tu información personal</li>
                <li>Solicitar correcciones o eliminación de tus datos</li>
                <li>Retirar tu consentimiento al uso de tus datos</li>
              </ul>
              <p>Puedes ejercer estos derechos contactando al soporte vía WhatsApp.</p>
              <h4>7. SOPORTE</h4>
              <p>Todas las consultas sobre privacidad pueden realizarse exclusivamente a través del ícono de soporte dentro de la app, que redirige a nuestro canal oficial de WhatsApp.</p>
              <h4>8. CAMBIOS EN ESTA POLÍTICA</h4>
              <p>Nos reservamos el derecho a modificar esta política en cualquier momento. Cualquier cambio será notificado dentro de la app o en nuestros canales oficiales.</p>
              <hr className="my-3"/>
              <p>Al registrarte y utilizar RIFAZO, aceptas estas Políticas de Privacidad.</p>
              <p><strong>Equipo de RIFAZO</strong></p>
            </div>
          </ScrollArea>
          <DialogFooter>
             <DialogClose asChild>
                <Button onClick={() => setIsPrivacyPolicyOpen(false)} variant="outline" size="sm">Cerrar</Button>
             </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Terms and Conditions Dialog */}
      <Dialog open={isTermsOpen} onOpenChange={setIsTermsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center"><FileText className="mr-2 h-5 w-5 text-primary" />TÉRMINOS Y CONDICIONES DE USO DE LA APLICACIÓN RIFAZO</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4 my-4">
             <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground space-y-3 text-xs">
              <p><strong>Última actualización:</strong> [Junio 2025]</p>
              <p>Bienvenido a RIFAZO. Esta aplicación tiene como propósito facilitar la gestión de rifas creadas por terceros (denominados en adelante "Administradores"). Al registrarte y utilizar esta aplicación, aceptas los siguientes términos y condiciones:</p>
              <h4>1. NATURALEZA DEL SERVICIO</h4>
              <p>RIFAZO es una plataforma digital que permite a los administradores organizar rifas y a los usuarios seleccionar números de participación. La app no gestiona ni procesa pagos, premios ni sorteos de manera directa.</p>
              <h4>2. PAGO Y ENTREGA DE PREMIOS</h4>
              <p>Los pagos de boletos y la entrega de premios son gestionados exclusivamente entre el usuario y el administrador de la rifa a través de WhatsApp u otros medios acordados. RIFAZO no actúa como intermediario financiero ni garantiza ninguna transacción.</p>
              <h4>3. RESPONSABILIDAD DE LOS ADMINISTRADORES</h4>
              <p>Cada rifa publicada en la plataforma es responsabilidad exclusiva del administrador que la crea. RIFAZO no se hace responsable de la veracidad, cumplimiento o legalidad de las rifas publicadas.</p>
              <h4>4. USO ADECUADO</h4>
              <p>Está prohibido utilizar la plataforma para actividades fraudulentas, ilegales o que infrinjan leyes venezolanas o derechos de terceros. Cualquier usuario que infrinja esta norma podrá ser bloqueado sin previo aviso.</p>
              <h4>5. PROTECCIÓN DE DATOS</h4>
              <p>La información personal proporcionada por los usuarios será utilizada únicamente para permitir el funcionamiento de la app (registro, participación en rifas y comunicación básica). No compartimos datos con terceros.</p>
              <h4>6. SOPORTE</h4>
              <p>El soporte técnico o funcional de la app se brinda exclusivamente a través de WhatsApp mediante el ícono de soporte presente dentro de la aplicación.</p>
              <h4>7. MODIFICACIONES</h4>
              <p>Nos reservamos el derecho de modificar estos términos en cualquier momento. Las modificaciones serán notificadas dentro de la app o en la página oficial del servicio.</p>
              <h4>8. ACEPTACIÓN</h4>
              <p>Al registrarte en RIFAZO, confirmas que has leído y aceptado estos Términos y Condiciones.</p>
              <hr className="my-3"/>
              <p>Si tienes dudas, puedes contactarnos por WhatsApp desde el botón de soporte dentro de la aplicación.</p>
              <p><strong>Equipo de RIFAZO</strong></p>
            </div>
          </ScrollArea>
          <DialogFooter>
            <DialogClose asChild>
              <Button onClick={() => setIsTermsOpen(false)} variant="outline" size="sm">Cerrar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
