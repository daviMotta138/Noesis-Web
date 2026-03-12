import { createPortal } from 'react-dom';
import Joyride, { type Step, type CallBackProps, STATUS } from 'react-joyride';
import { useGameStore } from '../store/useGameStore';

interface TutorialOverlayProps {
    steps: Step[];
    tutorialKey: string;
    run?: boolean;
}

export function TutorialOverlay({ steps, tutorialKey, run }: TutorialOverlayProps) {
    const { profile, markTutorialSeen } = useGameStore();

    // If profile is not loaded or this specific tutorial has been seen, don't run it
    const hasSeen = profile?.tutorial_state?.[tutorialKey];
    const shouldRun = run !== false && profile !== null && !hasSeen;

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status } = data;
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

        if (finishedStatuses.includes(status)) {
            markTutorialSeen(tutorialKey);
        }
    };

    const joyride = (
        <Joyride
            steps={steps}
            run={shouldRun}
            continuous
            showProgress
            showSkipButton
            disableOverlayClose
            hideCloseButton
            scrollToFirstStep
            callback={handleJoyrideCallback}
            styles={{
                options: {
                    arrowColor: '#1A1D30',
                    backgroundColor: '#1A1D30',
                    overlayColor: 'rgba(0, 0, 0, 0.85)',
                    primaryColor: '#D4A853', // highlight color
                    textColor: '#FFF',
                    zIndex: 10000,
                },
                tooltip: {
                    borderRadius: '16px',
                    border: '2px solid rgba(212, 168, 83, 0.5)',
                    boxShadow: '0 0 40px rgba(0,0,0,0.8)',
                    fontFamily: 'Outfit, sans-serif'
                },
                buttonNext: {
                    background: 'linear-gradient(135deg, #C49333 0%, #E8B84B 50%, #C49333 100%)',
                    borderRadius: '8px',
                    color: '#1A1000',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    fontSize: '12px',
                    padding: '8px 16px',
                },
                buttonSkip: {
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: '12px'
                },
                buttonBack: {
                    color: '#D4A853',
                    fontSize: '12px'
                }
            }}
            locale={{
                back: 'Voltar',
                close: 'Fechar',
                last: 'Concluir',
                next: 'Avançar',
                skip: 'Pular',
            }}
        />
    );

    // Render via portal so Joyride's position:fixed overlay
    // works correctly even inside CSS transform contexts (HorizontalCanvas)
    return createPortal(joyride, document.body);
}
