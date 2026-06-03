/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.bluetooth.BluetoothGattDescriptor
 */
package com.inuker.bluetooth.library.connect.b;

import android.bluetooth.BluetoothGattDescriptor;
import com.inuker.bluetooth.library.connect.b.i;
import com.inuker.bluetooth.library.connect.c.b;
import com.inuker.bluetooth.library.connect.listener.k;
import java.util.UUID;

public class j
extends i
implements k {
    private UUID p;
    private UUID q;

    public j(UUID uUID, UUID uUID2, b b2) {
        super(b2);
        this.p = uUID;
        this.q = uUID2;
    }

    @Override
    public void i() {
        switch (this.e()) {
            case 0: {
                this.c(-1);
                break;
            }
            case 2: {
                this.q();
                break;
            }
            case 19: {
                this.q();
                break;
            }
            default: {
                this.c(-1);
            }
        }
    }

    private void q() {
        if (!this.a(this.p, this.q, false)) {
            this.c(-1);
        } else {
            this.o();
        }
    }

    @Override
    public void a(BluetoothGattDescriptor bluetoothGattDescriptor, int n2) {
        this.p();
        if (n2 == 0) {
            this.c(0);
        } else {
            this.c(-1);
        }
    }
}

