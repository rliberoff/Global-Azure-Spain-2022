import './App.css';
import React from 'react';
import { AzureFunctionTokenProvider, AzureClient } from '@fluidframework/azure-client';
import { ContainerSchema, IFluidContainer, SharedString } from 'fluid-framework';
import { SharedStringHelper } from '@fluid-experimental/react-inputs';
import { ConnectionState } from '@fluidframework/container-loader';

import { faker } from '@faker-js/faker';

import { CollaborativeMarkdown } from './CollaborativeMarkdown';

const useSharedString = (): SharedString => {
    const [sharedString, setSharedString] = React.useState<SharedString>();
    const getFluidData = async () => {
        const ordererUrl = 'https://alfred.westeurope.fluidrelay.azure.com';
        const storageUrl = 'https://historian.westeurope.fluidrelay.azure.com';

        const config = {
            tenantId: '4547a784-4fdc-4947-8174-0c20c05df242',
            tokenProvider: new AzureFunctionTokenProvider('https://func-globalazure2022-relv.azurewebsites.net/api/azurefunctiontokenprovider', { userId: faker.datatype.uuid(), userName: faker.internet.userName() }),
            orderer: ordererUrl,
            storage: storageUrl,
        };

        const clientProps = {
            connection: config,
        };

        // Configure the container.
        const client: AzureClient = new AzureClient(clientProps);;
        const containerSchema: ContainerSchema = {
            initialObjects: { sharedString: SharedString },
        };

        // Get the container from the Fluid service.
        let container: IFluidContainer;
        const containerId = window.location.hash.substring(1);
        if (!containerId) {
            container = (await client.createContainer(containerSchema)).container;
            const id = await container.attach();
            window.location.hash = id;
        } else {
            container = (await client.getContainer(containerId, containerSchema)).container;
            if (container.connectionState !== ConnectionState.Connected) {
                await new Promise<void>((resolve) => {
                    container.once('connected', () => {
                        resolve();
                    });
                });
            }
        }
        // Return the Fluid SharedString object.
        return container.initialObjects.sharedString as SharedString;
    };

    // Get the Fluid Data data on app startup and store in the state
    React.useEffect(() => {
        getFluidData().then((data) => setSharedString(data));
    }, []);

    return sharedString as SharedString;
};

function App() {
    // Load the collaborative SharedString object
    const sharedString = useSharedString();

    // Create the view using CollaborativeTextArea & SharedStringHelper
    if (sharedString) {
        return (
            <div className="App">
                <CollaborativeMarkdown sharedStringHelper={new SharedStringHelper(sharedString)} textAreaSuffixId={faker.datatype.uuid()} />
            </div>
        );
    } else {
        return <div />;
    }
}

export default App;
