import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';

// Initialize NFC
NfcManager.start();

const App = () => {
    const [message, setMessage] = useState('');
    const [pageInput, setPageInput] = useState('');

    const clearTextView = () => setMessage('');

    // Log message callback function
    const logCallback = (logMessage: string) => {
        setMessage(prev => prev + '\n' + logMessage); // Append new log message to the previous ones
    };

    const readNfcTag = async () => {
        try {
            logCallback('Initializing NFC...');
            await NfcManager.requestTechnology(NfcTech.NfcA);
            const tag = await NfcManager.getTag();

            if (!tag) {
                logCallback('Read Failed: No Tag Detected');
                return;
            }

            logCallback('Read Success: Tag Detected');

            // Check if password protection is enabled (AUTH0 at page E3, Byte 3)
            const auth0Page = 0xE3;
            let authData = await NfcManager.transceive([0x30, auth0Page]);
            const auth0 = authData[3];

            if (auth0 !== 0xFF) {
                logCallback('Password Required for Protected Pages');
            } else {
                logCallback('No Password Required');
            }

        } catch (error) {
            logCallback(`Read Failed: ${error.message}`);
        } finally {
            NfcManager.cancelTechnologyRequest();
        }
    };

    const readMemoryPage = async () => {
        try {
            const page = parseInt(pageInput, 16);
            if (isNaN(page) || page < 0 || page > 0xE6) {
                Alert.alert('Invalid Page Address');
                return;
            }

            await NfcManager.requestTechnology(NfcTech.NfcA);
            let pageData = await NfcManager.transceive([0x30, page]);
            logCallback(`Page ${pageInput}: ${pageData.toString()}`);
        } catch (error) {
            logCallback(`Read Failed: ${error.message}`);
        } finally {
            NfcManager.cancelTechnologyRequest();
        }
    };

    const enablePasswordProtection = async () => {
        try {
            await NfcManager.requestTechnology(NfcTech.NfcA);

            const password = [0xA1, 0xB2, 0xC3, 0xD4];
            const pack = [0x12, 0x34];

            await NfcManager.transceive([0xA2, 0xE5, ...password]); // Set password
            await NfcManager.transceive([0xA2, 0xE6, ...pack]); // Set PACK
            await NfcManager.transceive([0xA2, 0xE3, 0x2C, 0x00, 0x00, 0x00]); // Set AUTH0 to page 44
            await NfcManager.transceive([0xA2, 0xE4, 0x03, 0x00, 0x00, 0x00]); // Enable read/write protection

            logCallback('Password Protection Enabled from Page 44+');
        } catch (error) {
            logCallback(`Failed to Set Password: ${error.message}`);
        } finally {
            NfcManager.cancelTechnologyRequest();
        }
    };

    const writeDeepLink = async () => {
        try {
            await NfcManager.requestTechnology(NfcTech.Ndef);

            const deepLink = Ndef.encodeMessage([
                Ndef.uriRecord('https://play.google.com/store/apps/details?id=com.example.myapp')
            ]);

            await NfcManager.ndefHandler.writeNdefMessage(deepLink);
            logCallback('Deep Link Written to Page 4');
        } catch (error) {
            logCallback(`Write Failed: ${error.message}`);
        } finally {
            NfcManager.cancelTechnologyRequest();
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>NTAG216 NFC Tool</Text>
            <TouchableOpacity style={styles.button} onPress={readNfcTag}>
                <Text style={styles.buttonText}>Read NFC Tag</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={enablePasswordProtection}>
                <Text style={styles.buttonText}>Enable Password</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={writeDeepLink}>
                <Text style={styles.buttonText}>Write Deep Link</Text>
            </TouchableOpacity>
            <TextInput
                style={styles.input}
                placeholder="Enter Page Address from h4"
                value={pageInput}
                onChangeText={setPageInput}
            />
            <TouchableOpacity style={styles.button} onPress={readMemoryPage}>
                <Text style={styles.buttonText}>Read Page</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={clearTextView}>
                <Text style={styles.buttonText}>Clear</Text>
            </TouchableOpacity>
            <Text style={styles.message}>{message}</Text>
        </ScrollView>
    );
};

// Styles for UI
const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 20,
    },
    title: {
        position: 'absolute',
        top: 50,
        fontSize: 24,
        fontWeight: 'bold',
        color: 'red',
    },
    button: {
        backgroundColor: '#007bff',
        padding: 15,
        margin: 10,
        borderRadius: 10,
        width: 250,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        padding: 10,
        margin: 10,
        width: 250,
        textAlign: 'center',
    },
    message: {
        marginTop: 20,
        fontSize: 16,
        color: '#333',
        textAlign: 'center',
    },
});

export default App;
