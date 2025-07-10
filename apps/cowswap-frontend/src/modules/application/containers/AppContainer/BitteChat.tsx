import { ReactNode, useCallback, useState } from 'react'

import { useSwitchNetwork, useWalletInfo } from '@cowprotocol/wallet'
import { useWalletProvider } from '@cowprotocol/wallet-provider'

import { BitteWidgetChat } from '@bitte-ai/chat'
import '@bitte-ai/chat/styles.css'

export function BitteChat(): ReactNode {
  const { chainId, account } = useWalletInfo()
  const provider = useWalletProvider()
  const switchNetwork = useSwitchNetwork()

  const [currentHash, setCurrentHash] = useState<string | undefined>()
  const [currentSignature, setCurrentSignature] = useState<string | undefined>()

  const handleSendTransaction = useCallback(async (transaction: { to?: string; data?: string; value?: string; gasLimit?: string }) => {
    if (!provider) throw new Error('No provider available')

    const signer = provider.getSigner()
    const txResponse = await signer.sendTransaction(transaction)
    setCurrentHash(txResponse.hash)
    return txResponse.hash
  }, [provider])

  const handleSwitchChain = useCallback(async (params: { chainId: number }) => {
    await switchNetwork(params.chainId)
  }, [switchNetwork])

  const handleSignMessage = useCallback(async (params: { message: string }) => {
    if (!provider) throw new Error('No provider available')

    const signer = provider.getSigner()
    const signature = await signer.signMessage(params.message)
    setCurrentSignature(signature)
    return signature
  }, [provider])

  const handleSignTypedData = useCallback(async (typedData: Record<string, unknown>) => {
    if (!provider) throw new Error('No provider available')

    const signer = provider.getSigner()
    // Type assertion needed for compatibility with ethers signer
    const signature = await signer._signTypedData(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      typedData.domain as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      typedData.types as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      typedData.value as any
    )
    setCurrentSignature(signature)
    return signature
  }, [provider])

  // Parse signature manually if available
  const parsedSignature = currentSignature ? {
    r: currentSignature.slice(0, 66) as `0x${string}`,
    s: ('0x' + currentSignature.slice(66, 130)) as `0x${string}`,
    v: BigInt(parseInt(currentSignature.slice(130, 132), 16)),
    yParity: parseInt(currentSignature.slice(130, 132), 16) === 27 ? 0 : 1
  } : undefined;

  return (
    <BitteWidgetChat
      agentId="near-cow-agent-git-types-rm-eip712-bitteprotocol.vercel.app"
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
          // Type assertions needed due to incompatible types between CowSwap and BitteChat
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sendTransaction: handleSendTransaction as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          switchChain: handleSwitchChain as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          signMessage: handleSignMessage as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          signTypedData: handleSignTypedData as any,
          hash: currentHash,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          signature: parsedSignature as any,
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