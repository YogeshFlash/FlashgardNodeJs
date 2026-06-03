/*
 * Decompiled with CFR 0.152.
 */
package com.inuker.bluetooth.library.b.a;

import com.inuker.bluetooth.library.b.a.e;
import java.lang.reflect.Field;
import java.nio.ByteBuffer;

public class a
extends e {
    public static final int a = 0;
    public static final int b = 1;
    public static final int c = 2;
    public static final int d = 3;
    public static final int e = 4;
    public static final int f = 5;
    private int o;
    private int p;

    public a(int n2) {
        this(n2, 0);
    }

    public a(int n2, int n3) {
        this.o = n2;
        this.p = n3;
    }

    @Override
    public String a() {
        return "ack";
    }

    public int b() {
        return this.o;
    }

    public int c() {
        return this.p;
    }

    @Override
    public byte[] d() {
        ByteBuffer byteBuffer = ByteBuffer.wrap(h);
        byteBuffer.putShort((short)0);
        byteBuffer.put((byte)1);
        byteBuffer.put((byte)0);
        byteBuffer.putShort((short)this.o);
        byteBuffer.putShort((short)this.p);
        return byteBuffer.array();
    }

    public String toString() {
        return "ACKPacket{status=" + this.a(this.o) + ", seq=" + this.p + '}';
    }

    private String a(int n2) {
        for (Field field : this.getClass().getDeclaredFields()) {
            if ((field.getModifiers() & 0x18) <= 0) continue;
            try {
                if (field.get(null) != Integer.valueOf(n2)) continue;
                return field.getName();
            }
            catch (IllegalAccessException illegalAccessException) {
                illegalAccessException.printStackTrace();
            }
        }
        return n2 + "";
    }
}

