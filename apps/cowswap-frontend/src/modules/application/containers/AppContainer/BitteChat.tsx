import { ReactNode, useCallback, useState } from 'react'

import { useWalletInfo } from '@cowprotocol/wallet'
import { useSwitchNetwork } from '@cowprotocol/wallet'
import { useWalletProvider } from '@cowprotocol/wallet-provider'

import { BitteWidgetChat } from '@bitte-ai/chat'
import '@bitte-ai/chat/styles.css'
import { parseSignature } from 'viem'

interface BitteChatProps {
  account?: string
}

export function BitteChat({ account }: BitteChatProps): ReactNode {
  const provider = useWalletProvider()
  const { chainId } = useWalletInfo()
  const switchNetwork = useSwitchNetwork()
  const [lastTxHash, setLastTxHash] = useState<string>()
  const [lastSignature, setLastSignature] = useState<string>()

  

  const sendTransaction = useCallback(async (txParams: unknown) => {
    if (!provider || !account) {
      throw new Error('Wallet not connected')
    }

    const signer = provider.getSigner()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tx = await signer.sendTransaction(txParams as any)
    setLastTxHash(tx.hash)
    return tx.hash
  }, [provider, account])

  const handleSwitchChain = useCallback(async (params: unknown) => {
    if (!provider) {
      throw new Error('Wallet not connected')
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chainId = (params as any)?.chainId || params
    await switchNetwork(chainId)
  }, [provider, switchNetwork])

  const signMessage = useCallback(async (params: unknown) => {
    if (!provider || !account) {
      throw new Error('Wallet not connected')
    }

    const signer = provider.getSigner()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const message = (params as any)?.message || params
    const signature = await signer.signMessage(message)
    setLastSignature(signature)
    return signature
  }, [provider, account])

  const signTypedData = useCallback(async (params: unknown) => {
    if (!provider || !account) {
      throw new Error('Wallet not connected')
    }

    const signer = provider.getSigner()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { domain, types, value } = params as any
    const signature = await signer._signTypedData(domain, types, value)
    setLastSignature(signature)
    return signature
  }, [provider, account])

  return (
    <BitteWidgetChat
      agentId="near-cow-agent-git-staging-bitteprotocol.vercel.app"
      options={{
        agentName: 'CoW Swap Assistant',
        agentImage: '/favicon-dark-mode.png',
      }}
      apiUrl="/api/bitte/chat"
      historyApiUrl="/api/bitte/history"
      wallet={{
        evm: {
          address: account,
          chainId: chainId,
          sendTransaction: sendTransaction,
          switchChain: handleSwitchChain,
          signMessage: signMessage,
          signTypedData: signTypedData,
          hash: lastTxHash,
          signature: parseSignature(lastSignature as `0x${string}`),
        },
      }}
      widget={{
        triggerButtonStyles: {
          backgroundColor: '#84D7FB',
          logoColor: '#000000',
        },
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