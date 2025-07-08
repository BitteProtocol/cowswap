import { ReactNode, useMemo } from 'react'

import { initPixelAnalytics, useAnalyticsReporter, useCowAnalytics, WebVitalsAnalytics } from '@cowprotocol/analytics'
import { useFeatureFlags, useMediaQuery } from '@cowprotocol/common-hooks'
import { isInjectedWidget } from '@cowprotocol/common-utils'
import { Footer, Media } from '@cowprotocol/ui'
import { useWalletDetails, useWalletInfo } from '@cowprotocol/wallet'

import { BitteWidgetChat } from '@bitte-ai/chat'
import '@bitte-ai/chat/styles.css'
import Snowfall from 'react-snowfall'

import { URLWarning } from 'legacy/components/Header/URLWarning'
import { useDarkModeManager } from 'legacy/state/user/hooks'

import { OrdersPanel } from 'modules/account'
import { useInjectedWidgetMetaData } from 'modules/injectedWidget'
import { useInitializeUtm } from 'modules/utm'

import { CoWAmmBanner } from 'common/containers/CoWAmmBanner'
import { InvalidLocalTimeWarning } from 'common/containers/InvalidLocalTimeWarning'
import { useCustomTheme } from 'common/hooks/useCustomTheme'
import { useGetMarketDimension } from 'common/hooks/useGetMarketDimension'

import { ADDITIONAL_FOOTER_CONTENT, PRODUCT_VARIANT } from '../App/menuConsts'
import * as styledEl from '../App/styled'
import { AppMenu } from '../AppMenu'
import { NetworkAndAccountControls } from '../NetworkAndAccountControls'

// Initialize static analytics instance
const pixel = initPixelAnalytics()

interface AppContainerProps {
  children: ReactNode | ReactNode[]
}

function BitteChat({ account }: { account?: string }) : ReactNode {
  return (
    <BitteWidgetChat
      agentId="near-cow-agent-git-dev-bitteprotocol.vercel.app"
      options={{
        agentName: 'CoW Swap Assistant',
        agentImage: '/favicon-dark-mode.png',
      }}
      apiUrl="/api/bitte/chat"
      historyApiUrl="/api/bitte/history"
      wallet={{
        evm: {
          address: account,
          sendTransaction: async () => {
            console.warn('sendTransaction not implemented yet - wagmi hooks need QueryClient setup')
            return null
          },
          switchChain: async () => {
            console.warn('switchChain not implemented yet - wagmi hooks need QueryClient setup')
          },
          //hash: hash ? String(hash) : undefined,
          //sendTransaction: sendTransaction as any,
          //switchChain: switchNetwork as any
        },
      }}
      widget={{
        widgetWelcomePrompts: {
          questions: [
            'What is CoW Swap?',
            'How does CoW Protocol work?',
            'What are the benefits of using CoW Swap?'
          ],
          actions: ['Swap tokens', 'Check price', 'View orders'],
        },
      }}
    />
  )
}

export function AppContainer({ children }: AppContainerProps): ReactNode {
  const { chainId, account } = useWalletInfo()
  const { walletName } = useWalletDetails()
  const cowAnalytics = useCowAnalytics()
  const webVitals = useMemo(() => new WebVitalsAnalytics(cowAnalytics), [cowAnalytics])


  useAnalyticsReporter({
    account,
    chainId,
    walletName,
    cowAnalytics,
    pixelAnalytics: pixel,
    webVitalsAnalytics: webVitals,
    marketDimension: useGetMarketDimension() || undefined,
    injectedWidgetAppId: useInjectedWidgetMetaData()?.appCode,
  })

  useInitializeUtm()

  const { isYieldEnabled } = useFeatureFlags()
  const isInjectedWidgetMode = isInjectedWidget()
  const [darkMode] = useDarkModeManager()

  const isMobile = useMediaQuery(Media.upToMedium(false))

  const customTheme = useCustomTheme()

  const networkAndAccountControls = <NetworkAndAccountControls />

  const isChristmasTheme = customTheme === 'darkChristmas' || customTheme === 'lightChristmas'

  return (
    <styledEl.AppWrapper>
      <URLWarning />
      <InvalidLocalTimeWarning />

      <OrdersPanel />

      <AppMenu>{networkAndAccountControls}</AppMenu>

      {isYieldEnabled && <CoWAmmBanner />}

      <styledEl.BodyWrapper customTheme={customTheme}>
        {children}
        <styledEl.Marginer />
      </styledEl.BodyWrapper>

      <BitteChat account={account} />

      {!isInjectedWidgetMode && isChristmasTheme && (
        <Snowfall
          style={{
            position: 'fixed',
            width: '100vw',
            height: '100vh',
            zIndex: 3,
            pointerEvents: 'none',
            top: 0,
            left: 0,
          }}
          snowflakeCount={isMobile ? 25 : darkMode ? 75 : 200}
          radius={[0.5, 2.0]}
          speed={[0.5, 2.0]}
          wind={[-0.5, 1.0]}
        />
      )}

      {!isInjectedWidgetMode && (
        <Footer productVariant={PRODUCT_VARIANT} additionalFooterContent={ADDITIONAL_FOOTER_CONTENT} hasTouchFooter />
      )}

      {/* Render MobileHeaderControls outside of MenuBar on mobile */}
      {isMobile && !isInjectedWidgetMode && networkAndAccountControls}
    </styledEl.AppWrapper>
  )
}
