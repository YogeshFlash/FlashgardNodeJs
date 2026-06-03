/*
 * Decompiled with CFR 0.152.
 */
package com.inuker.bluetooth.library.b.a;

import com.inuker.bluetooth.library.b.a.e;
import java.nio.ByteBuffer;

public class b
extends e {
    private int a;

    public b(int n2) {
        this.a = n2;
    }

    public int b() {
        return this.a;
    }

    @Override
    public String a() {
        return "ctr";
    }

    @Override
    public byte[] d() {
        ByteBuffer byteBuffer = ByteBuffer.wrap(h);
        byteBuffer.putShort((short)0);
        byteBuffer.put((byte)0);
        byteBuffer.put((byte)0);
        byteBuffer.putShort((short)this.a);
        return byteBuffer.array();
    }

    public String toString() {
        return "FlowPacket{frameCount=" + this.a + '}';
    }
}

