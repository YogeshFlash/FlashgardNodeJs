/*
 * Decompiled with CFR 0.152.
 */
package com.inuker.bluetooth.library.b.a;

import com.inuker.bluetooth.library.b.a.e;
import java.nio.ByteBuffer;
import java.util.Arrays;

public class c
extends e {
    private int a;
    private e.a b;
    private byte[] c;

    public c(int n2, e.a a2) {
        this.a = n2;
        this.b = a2;
    }

    public c(int n2, byte[] byArray, int n3, int n4) {
        this(n2, new e.a(byArray, n3, n4));
    }

    public int b() {
        return this.a;
    }

    public int c() {
        return this.b.a();
    }

    @Override
    public String a() {
        return "data";
    }

    public void e() {
        this.b.c -= 2;
        this.c = com.inuker.bluetooth.library.e.c.b(this.b.a, this.b.c, 2);
    }

    public byte[] f() {
        return this.c;
    }

    @Override
    public byte[] d() {
        ByteBuffer byteBuffer;
        int n2 = this.c() + 2;
        if (n2 == 20) {
            Arrays.fill(h, (byte)0);
            byteBuffer = ByteBuffer.wrap(h);
        } else {
            byteBuffer = ByteBuffer.allocate(n2);
        }
        byteBuffer.putShort((short)this.a);
        this.a(byteBuffer);
        return byteBuffer.array();
    }

    public void a(ByteBuffer byteBuffer) {
        byteBuffer.put(this.b.a, this.b.b, this.c());
    }

    public String toString() {
        return "DataPacket{seq=" + this.a + ", size=" + this.b.a() + '}';
    }
}

