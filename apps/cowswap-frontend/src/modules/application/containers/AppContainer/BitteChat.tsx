import { ReactNode, useCallback, useState, useEffect } from 'react'

import { getChecksumAddressOrOriginal } from '@cowprotocol/common-utils'
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

  // Ensure address is properly checksummed for ethers.js compatibility
  const checksummedAccount = account ? getChecksumAddressOrOriginal(account) : undefined

  // Validate that the checksummed account matches the provider's signer address
  useEffect(() => {
    if (!provider || !checksummedAccount) return

    const validateAddress = async () => {
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

        // Get the signer's address to ensure consistency
        const signerAddress = await signer.getAddress()

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

        console.log('Sending transaction:', formattedTransaction, 'from signer:', signerAddress)

        const txResponse = await signer.sendTransaction(formattedTransaction)
        setCurrentHash(txResponse.hash)
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
        const signerAddress = await signer.getAddress()

        console.log('Signing message:', params.message, 'from signer:', signerAddress)

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

        // Type assertion needed for compatibility with ethers signer
        const signature = await signer._signTypedData(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          typedData.domain as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          typedData.types as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          typedData.value as any,
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
          questions: ['What is CoW Swap?', 'How does CoW Protocol work?', 'What are the benefits of using CoW Swap?'],
          actions: ['Swap tokens', 'Check price', 'View orders'],
        },
      }}
    />
  )
}
