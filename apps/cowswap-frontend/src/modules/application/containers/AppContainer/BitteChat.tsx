import { ReactNode, useCallback, useEffect, useState } from 'react'

import { getChecksumAddressOrOriginal } from '@cowprotocol/common-utils'
import { TypedDataTypes } from '@cowprotocol/contracts/lib/esm/types/ethers'
import { useSwitchNetwork, useWalletInfo } from '@cowprotocol/wallet'
import { useWalletProvider } from '@cowprotocol/wallet-provider'

import { BitteWidgetChat } from '@bitte-ai/chat'
import '@bitte-ai/chat/styles.css'
import { TypedDataDomain } from 'viem'

// eslint-disable-next-line max-lines-per-function
export function BitteChat(): ReactNode {
  const { chainId, account } = useWalletInfo()
  const provider = useWalletProvider()
  const switchNetwork = useSwitchNetwork()

  const [currentSignature, setCurrentSignature] = useState<string | undefined>()

  // Ensure address is properly checksummed for ethers.js compatibility
  const checksummedAccount = account ? getChecksumAddressOrOriginal(account) : undefined

  // Validate that the checksummed account matches the provider's signer address
  useEffect(() => {
    if (!provider || !checksummedAccount) return

    const validateAddress = async (): Promise<void> => {
      try {
        const signer = provider.getSigner()
        const signerAddress = await signer.getAddress()

        if (checksummedAccount.toLowerCase() !== signerAddress.toLowerCase()) {
          console.warn('Address mismatch detected:', {
            checksummedAccount,
            signerAddress,
          })
        } else {
          console.log('Address validation passed:', checksummedAccount)
        }
      } catch (error) {
        console.error('Address validation failed:', error)
      }
    }

    validateAddress()
  }, [provider, checksummedAccount])

  const handleSendTransaction = useCallback(
    async (transaction: { to?: string; data?: string; value?: string; gasLimit?: string; from?: string }) => {
      if (!provider) throw new Error('No provider available')

      try {
        const signer = provider.getSigner()

        // Clean the transaction object - remove 'from' field and ensure addresses are checksummed
        const cleanTransaction = {
          to: transaction.to ? getChecksumAddressOrOriginal(transaction.to) : undefined,
          data: transaction.data,
          value: transaction.value,
          gasLimit: transaction.gasLimit,
          // Never include 'from' field - the signer will handle this automatically
        }

        // Remove undefined fields
        const formattedTransaction = Object.fromEntries(
          Object.entries(cleanTransaction).filter(([_, value]) => value !== undefined),
        )

        const txResponse = await signer.sendTransaction(formattedTransaction)

        return txResponse.hash
      } catch (error) {
        console.error('Transaction failed:', error)
        throw error
      }
    },
    [provider],
  )

  const handleSwitchChain = useCallback(
    async (params: { chainId: number }) => {
      await switchNetwork(params.chainId)
    },
    [switchNetwork],
  )

  const handleSignMessage = useCallback(
    async (params: { message: string }) => {
      if (!provider) throw new Error('No provider available')

      try {
        const signer = provider.getSigner()

        const signature = await signer.signMessage(params.message)

        setCurrentSignature(signature)
        return signature
      } catch (error) {
        console.error('Message signing failed:', error)
        throw error
      }
    },
    [provider],
  )

  const handleSignTypedData = useCallback(
    async (typedData: Record<string, unknown>) => {
      if (!provider) throw new Error('No provider available')

      try {
        const signer = provider.getSigner()
        const signerAddress = await signer.getAddress()

        console.log('Signing typed data:', typedData, 'from signer:', signerAddress)

        // Validate the structure before signing
        if (!typedData.domain || !typedData.types || !typedData.message) {
          console.error('Invalid typed data structure:', typedData)
          throw new Error('Invalid typed data structure: missing domain, types, or value')
        }

        // Type assertion needed for compatibility with ethers signer
        const signature = await signer._signTypedData(
          typedData.domain as TypedDataDomain,
          typedData.types as TypedDataTypes,
          typedData.message,
        )

        setCurrentSignature(signature)
        return signature
      } catch (error) {
        console.error('Typed data signing failed:', error)
        throw error
      }
    },
    [provider],
  )

  // Parse signature manually if available
  const parsedSignature = currentSignature
    ? {
      r: currentSignature.slice(0, 66) as `0x${string}`,
      s: ('0x' + currentSignature.slice(66, 130)) as `0x${string}`,
      v: BigInt(parseInt(currentSignature.slice(130, 132), 16)),
      yParity: parseInt(currentSignature.slice(130, 132), 16) === 27 ? 0 : 1,
    }
    : undefined

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
          address: checksummedAccount,
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
          questions: ['What is CoW Swap?', 'How does CoW Protocol work?', 'What are the benefits of using CoW Swap?'],
          actions: ['Swap tokens', 'Check price', 'View orders'],
        },
      }}
    />
  )
}
